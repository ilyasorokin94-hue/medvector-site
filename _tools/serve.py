"""Локальный сервер для тестов. Отдаёт сайт так же, как его отдают хостинг (mod_deflate в .htaccess) и GitHub Pages:
текстовые файлы сжаты gzip, соединение не закрывается после каждого файла.

    python3 _tools/serve.py [порт=8099]
"""
import gzip
import io
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT = {'.html', '.css', '.js', '.svg', '.json', '.xml', '.txt'}


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        url_path = self.path.split('?', 1)[0].split('#', 1)[0]
        path = Path(self.translate_path(self.path))
        if path.is_dir() and url_path.endswith('/'):
            path = path / 'index.html'
        if path.is_file() and path.suffix in TEXT and 'gzip' in self.headers.get('Accept-Encoding', ''):
            body = gzip.compress(path.read_bytes(), 6)  # уровень 6, как у mod_deflate по умолчанию
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(str(path)))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Vary', 'Accept-Encoding')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            return io.BytesIO(body)
        return super().send_head()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
    print(f'http://127.0.0.1:{port}/ (gzip для текста, папка {ROOT})', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
