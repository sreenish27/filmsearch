import json

with open('./filmdata/allfilms.jsonl', 'r') as f, open('filmtitle.jsonl', 'w') as f_w:
    for line in f:
        item = json.loads(line)
        filmname = item['title']
        f_w.write(json.dumps(filmname) + ',' + '\n')
