#!/usr/bin/env python3
"""Сцена для видеоряда на главной: из любого исходного ролика делает три файла в assets/video/.

    python3 _tools/film.py <исходник.mp4> <имя> [секунд=6] [начало=0] [--hero]

    --hero   фон первого экрана: 1280x720, до 1400 КБ, конец ролика плавно переходит в начало (петля без рывка)

Получается:
    assets/video/<имя>.webm   VP9, 960x540, 24 кадра, без звука
    assets/video/<имя>.mp4    H.264, то же, для браузеров без WebM
    assets/video/<имя>.webp   первый кадр, он же заставка до загрузки видео

Бюджет сцены в панели услуг: каждое видео не больше 500 КБ, заставка не больше 40 КБ. Если не уложились, скрипт сам
понижает битрейт или качество и пишет итоговые размеры. Нужен ffmpeg с libvpx-vp9, libx264 и libwebp.
"""
import os
import subprocess
import sys
import tempfile

W, H, FPS = 960, 540, 24
VIDEO_MAX = 500 * 1024
STILL_MAX = 40 * 1024
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'video')


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y'] + args, check=True)


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    global W, H, VIDEO_MAX, STILL_MAX
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    hero = '--hero' in sys.argv
    src, name = args[0], args[1]
    secs = float(args[2]) if len(args) > 2 else 6.0
    start = float(args[3]) if len(args) > 3 else 0.0
    if hero:
        W, H, VIDEO_MAX, STILL_MAX = 1280, 720, 1400 * 1024, 70 * 1024
    os.makedirs(OUT, exist_ok=True)
    # кадр заполняет 960x540 целиком: лишнее по краям обрезается
    vf = f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},format=yuv420p'
    cut = ['-ss', str(start), '-t', str(secs), '-i', src, '-an', '-vf', vf]
    if hero:
        # петля: последняя секунда растворяется в первой, ролик становится на секунду короче
        X = 1.0
        graph = (f'[0:v]{vf},split[a][b];[a]trim={X}:{secs},setpts=PTS-STARTPTS[body];[b]trim=0:{X},setpts=PTS-STARTPTS[head];'
                 f'[body][head]xfade=transition=fade:duration={X}:offset={secs - 2 * X},format=yuv420p[out]')
        cut = ['-ss', str(start), '-t', str(secs), '-i', src, '-an', '-filter_complex', graph, '-map', '[out]']
        secs -= X
    sizes = {}
    with tempfile.TemporaryDirectory() as tmp:
        log = os.path.join(tmp, 'pass')
        for ext, codec in (('webm', ['-c:v', 'libvpx-vp9', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1']),
                           ('mp4', ['-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-movflags', '+faststart'])):
            out = os.path.join(OUT, f'{name}.{ext}')
            rate = int(VIDEO_MAX * 8 / secs * 0.92)
            while True:
                br = ['-b:v', str(rate), '-maxrate', str(int(rate * 1.4)), '-bufsize', str(rate * 2)]
                run(cut + codec + br + ['-pass', '1', '-passlogfile', log, '-f', 'null', os.devnull])
                run(cut + codec + br + ['-pass', '2', '-passlogfile', log, out])
                if os.path.getsize(out) <= VIDEO_MAX or rate < 150000:
                    break
                rate = int(rate * 0.85)
            sizes[ext] = os.path.getsize(out)
        still = os.path.join(OUT, f'{name}.webp')
        q = 72
        while True:
            if hero:
                # заставка совпадает с первым кадром готовой петли: ролик подхватывает её без скачка
                run(['-i', os.path.join(OUT, f'{name}.mp4'), '-frames:v', '1', '-c:v', 'libwebp', '-quality', str(q), still])
            else:
                run(['-ss', str(start), '-i', src, '-frames:v', '1', '-vf', vf.replace(f',fps={FPS}', ''), '-c:v', 'libwebp', '-quality', str(q), still])
            if os.path.getsize(still) <= STILL_MAX or q <= 30:
                break
            q -= 8
        sizes['webp'] = os.path.getsize(still)
    print(name, ' '.join(f'{k} {v / 1024:.0f} КБ' for k, v in sizes.items()))
    if sizes['webm'] > VIDEO_MAX or sizes['mp4'] > VIDEO_MAX or sizes['webp'] > STILL_MAX:
        sys.exit('Не уложились в бюджет: сцена слишком насыщенная, сократите её или упростите кадр.')


if __name__ == '__main__':
    main()
