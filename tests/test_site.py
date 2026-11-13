import re
from html.parser import HTMLParser
import unittest
from unittest.mock import patch

from app import app
from localization import DutchHTML


class SiteTests(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_all_pages_in_both_languages(self):
        for language in ('en', 'nl'):
            for route in ('/', '/membership', '/how', '/about', '/business', '/contact', '/privacy', '/terms'):
                with self.subTest(language=language, route=route):
                    response = self.client.get(route, query_string={'lang': language})
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.headers['Content-Language'], language)
                    self.assertIn(f'<html lang="{language}">', response.get_data(as_text=True))

    def test_language_persists_and_can_be_changed(self):
        self.client.get('/?lang=nl')
        html = self.client.get('/membership').get_data(as_text=True)
        self.assertIn('Wij zijn een winkel in Amsterdam', html)
        self.assertIn('href="/how?lang=nl"', html)
        self.assertIn('lang=en', html)
        self.client.get('/membership?lang=en')
        self.assertIn('We are a shop in Amsterdam', self.client.get('/membership').get_data(as_text=True))

    def test_both_legal_pages_are_translated(self):
        privacy = self.client.get('/privacy?lang=nl').get_data(as_text=True)
        terms = self.client.get('/terms?lang=nl').get_data(as_text=True)
        self.assertIn('Je rechten volgens de AVG', privacy)
        self.assertNotIn('Your GDPR Rights', privacy)
        self.assertIn('Artikel 14 – Toepasselijk recht en geschillen', terms)
        self.assertNotIn('Governing Law', terms)

    def test_translation_preserves_scripts_and_user_input(self):
        parser = DutchHTML()
        parser.feed('<textarea>Message &amp; Contact</textarea><script>const text = "Contact";</script><p>Contact</p>')
        output = ''.join(parser.output)
        self.assertIn('<textarea>Message &amp; Contact</textarea>', output)
        self.assertIn('<script>const text = "Contact";</script>', output)
        self.assertIn('<p>Contact</p>', output)

    def test_business_form_defaults_and_donation_delivery(self):
        for topic in ('business', 'fashion_donations'):
            with self.subTest(topic=topic):
                html = self.client.get('/contact', query_string={'topic': topic}).get_data(as_text=True)
                self.assertRegex(html, f'<option value="{topic}" selected>')
                with patch('app.send_contact_email', return_value=True) as send:
                    response = self.client.post('/contact', data={
                        'name': 'Business visitor', 'email': 'fashion@example.com',
                        'topic': topic, 'message': 'We would like to discuss our samples.',
                    })
                    self.assertEqual(response.status_code, 302)
                    self.assertEqual(send.call_args.args[0]['topic'], topic)
        html = self.client.get('/contact?topic=unrecognised').get_data(as_text=True)
        self.assertRegex(html, '<option value="general" selected>')

    def test_invalid_contact_submission_is_not_sent(self):
        with patch('app.send_contact_email') as send:
            self.client.post('/contact?lang=nl', data={
                'name': 'Someone', 'email': 'not an email', 'topic': 'business', 'message': 'A business request.',
            })
            send.assert_not_called()

    def test_membership_section_order(self):
        html = self.client.get('/membership').get_data(as_text=True)
        sections = ['<section class="hero"', '<section class="tiers"', '<section class="compare"',
                    '<section class="membership-calendar"', '<section class="hours-section"', '<section class="social-section']
        positions = [html.index(section) for section in sections]
        self.assertEqual(positions, sorted(positions))
        self.assertNotIn('hero-btns', html[positions[0]:positions[1]])

    def test_section_markup_is_balanced(self):
        class Structure(HTMLParser):
            def __init__(self):
                super().__init__()
                self.stack = []
                self.errors = []

            def handle_starttag(self, tag, attrs):
                if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
                    self.stack.append(tag)

            def handle_startendtag(self, tag, attrs):
                pass

            def handle_endtag(self, tag):
                if self.stack and self.stack[-1] == tag:
                    self.stack.pop()
                else:
                    self.errors.append(tag)

        for route in ('/', '/membership', '/how', '/about', '/business', '/contact', '/privacy', '/terms'):
            with self.subTest(route=route):
                parser = Structure()
                parser.feed(self.client.get(route).get_data(as_text=True))
                self.assertEqual(parser.errors, [])
                self.assertEqual(parser.stack, [])

    def test_scroll_examples_stay_identical(self):
        html = self.client.get('/how').get_data(as_text=True)
        cards = re.findall(r'<article class="example-card">(.*?)</article>', html, re.S)
        self.assertEqual(len(cards), 10)
        self.assertEqual(cards[:5], cards[5:])
        for card in (card for card in cards if 'Patagonia fleece' in card):
            self.assertIn('+ 3 sustainable brand points', card)
            self.assertIn('+ 2 natural fabric points', card)
            self.assertIn('= 8 points', card)


if __name__ == '__main__':
    unittest.main()
