#!/usr/bin/env python3
"""Refreshes assets/langs.json from the GitHub API and writes README.md from assets/content.json.

    python3 assets/gen.py            # fetch language stats, write README
    python3 assets/gen.py --offline  # keep the cached stats

The images are rendered by assets/render/render.mjs (headless Chrome + ffmpeg).
"""
import json, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
content = json.load(open(os.path.join(HERE, 'content.json')))
USER = content['user']

def esc(t): return t.replace('&', '&amp;').replace('<', '&lt;').replace('"', '&quot;')

def api(url, tok):
    req = urllib.request.Request(url if url.startswith('http') else 'https://api.github.com' + url,
                                 headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'profile-readme-gen',
                                          **({'Authorization': 'Bearer ' + tok} if tok else {})})
    return json.load(urllib.request.urlopen(req, timeout=20))

def fetch_languages():
    tok = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    repos = [r for r in api(f'/users/{USER}/repos?per_page=100&type=owner', tok) if not r['fork']]
    tot = {}
    for r in repos:
        for k, v in api(r['languages_url'], tok).items():
            tot[k] = tot.get(k, 0) + v
    json.dump({'repos': len(repos), 'langs': tot}, open(os.path.join(HERE, 'langs.json'), 'w'), indent=1)

def readme():
    cards = ''.join(f'<a href="https://github.com/{USER}/{c["repo"]}"><img src="assets/card-{c["file"]}.avif" width="25%" alt="{esc(c["title"])}: {esc(c["repo"])}, {esc(c["line"])}"></a>'
                    for c in content['cards'])
    return f'''<p align="center"><img src="assets/header.avif" width="100%" alt="hi, i am {USER}: robots, circuit boards, my own CPU, and little JavaScript worlds"></p>

<p align="center"><img src="assets/about.avif" width="100%" alt="{esc(' '.join(content['about']))}"></p>

<p align="center">{cards}</p>

<p align="center"><img src="assets/languages.avif" width="100%" alt="the languages I write"></p>

<!-- images are rendered by assets/render/render.mjs -->
'''

if __name__ == '__main__':
    if '--offline' not in sys.argv:
        try:
            fetch_languages()
        except Exception as e:
            print('language fetch failed, keeping cache:', e)
    md = readme()
    open(os.path.join(ROOT, 'README.md'), 'w').write(md)
    open(os.path.join(ROOT, 'preview.html'), 'w').write(
        '<body style="margin:0;background:#0d1117"><div style="max-width:880px;margin:24px auto">'
        + md.replace('<p ', '<p style="margin:0 0 16px;line-height:0" ') + '</div></body>')
    print('README.md written')
