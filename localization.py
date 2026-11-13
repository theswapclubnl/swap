"""Server-rendered English and Dutch copy with persistent language selection."""
import json
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from flask import g, request

TRANSLATIONS = json.loads((Path(__file__).parent / 'translations' / 'nl.json').read_text())


def normalize(text):
    return re.sub(r'\s+', ' ', text).strip()


def translate(text):
    key = normalize(text)
    translated = TRANSLATIONS.get(key)
    if translated is None:
        return text
    leading = text[:len(text) - len(text.lstrip())]
    trailing = text[len(text.rstrip()):]
    return leading + translated + trailing


def language_url(language):
    query = dict(request.args)
    query['lang'] = language
    return request.path + '?' + urlencode(query)


class DutchHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.output = []
        self.raw = None
        self.protected = False

    def handle_starttag(self, tag, attrs):
        translated = []
        for name, value in attrs:
            if value is not None and name in {'alt', 'title', 'placeholder', 'aria-label'}:
                value = translate(value)
            if value and name in {'href', 'action'} and value.startswith('/') and not value.startswith(('//', '/static/', '/favicon.ico')):
                parts = urlsplit(value)
                query = parse_qsl(parts.query, keep_blank_values=True)
                if not any(key == 'lang' for key, _ in query):
                    query.append(('lang', 'nl'))
                value = urlunsplit(('', '', parts.path, urlencode(query), parts.fragment))
            translated.append(name if value is None else f'{name}="{escape(value, quote=True)}"')
        attributes = (' ' + ' '.join(translated)) if translated else ''
        self.output.append(f'<{tag}{attributes}>')
        if tag == 'textarea':
            self.protected = True
        if tag in {'script', 'style'}:
            self.raw = tag

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.output[-1] = self.output[-1][:-1] + ' />'

    def handle_endtag(self, tag):
        self.output.append(f'</{tag}>')
        if tag == 'textarea':
            self.protected = False
        if tag == self.raw:
            self.raw = None

    def handle_data(self, data):
        self.output.append(data if self.raw else escape(data if self.protected else translate(data), quote=False))

    def handle_comment(self, data):
        self.output.append(f'<!--{data}-->')

    def handle_decl(self, data):
        self.output.append(f'<!{data}>')


def install_localization(app):
    @app.before_request
    def choose_language():
        selected = request.args.get('lang', request.cookies.get('swapclub_language', 'en'))
        g.language = selected if selected in {'en', 'nl'} else 'en'

    @app.context_processor
    def language_context():
        return {'current_language': g.get('language', 'en'), 'language_url': language_url}

    @app.after_request
    def localize_response(response):
        if response.mimetype == 'text/html' and not response.direct_passthrough:
            response.headers['Content-Language'] = g.get('language', 'en')
            response.vary.add('Cookie')
            if g.get('language') == 'nl':
                parser = DutchHTML()
                parser.feed(response.get_data(as_text=True))
                parser.close()
                response.set_data(''.join(parser.output))
            if request.args.get('lang') in {'en', 'nl'}:
                response.set_cookie('swapclub_language', g.language, max_age=31536000,
                                    secure=request.is_secure, httponly=True, samesite='Lax')
        return response
