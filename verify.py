import tempfile,shutil,json,hashlib
from pathlib import Path
import beauty
from asar import Archive,digest

def check_archive(before,after,expected):
    changed=[]
    assert set(before.index)==set(after.index)
    for name,v in before.entries():
        other=after.index[name]
        if v.get('unpacked') or 'link' in v:
            assert v==other,name
            continue
        data=after.read(name)
        if data!=before.read(name):changed.append(name)
        info=other.get('integrity')
        if info:
            assert hashlib.sha256(data).hexdigest()==info['hash'],name
            bs=info['blockSize']
            assert [hashlib.sha256(data[i:i+bs]).hexdigest() for i in range(0,max(len(data),1),bs)]==info['blocks'],name
    assert sorted(changed)==sorted(expected),changed
    return changed

def main():
    installed,backup,metadata=beauty.paths(beauty.DEFAULT)
    source=backup if backup.exists() else installed
    original=Archive(source)
    with tempfile.TemporaryDirectory(prefix='beauty-verify-') as tmp:
        folder=Path(tmp);(folder/'resources').mkdir();a,b,m=beauty.paths(folder);shutil.copy2(source,a)
        before=digest(a)
        pkg,replacements=beauty.build_replacements(original)
        print(beauty.enable(folder))
        print('Changed:',check_archive(original,Archive(a),replacements))
        first=digest(a);print(beauty.enable(folder));assert digest(a)==first
        state=json.loads(m.read_text())
        with a.open('ab') as f:f.write(b'tampered')
        for fn in (beauty.enable,beauty.restore):
            try:fn(folder)
            except RuntimeError:pass
            else:raise AssertionError('Must reject external changes')
        with a.open('r+b') as f:f.truncate(a.stat().st_size-8)
        assert digest(a)==state['patched'];print(beauty.restore(folder));assert digest(a)==before
        # Reproduce v1-to-v2 migration without replacing the true original backup.
        shutil.copy2(source,b)
        css=next(n for n in original.index if n.startswith('out/renderer/assets/main-') and n.endswith('.css'))
        v1=a.with_suffix('.v1');original.repack(v1,{css:original.read(css)+b'\n/* Beauty OpenCode v1 */'})
        v1.replace(a);m.write_text(json.dumps({'version':pkg['version'],'original':before,'patched':digest(a)}))
        print(beauty.enable(folder));assert digest(b)==before
        check_archive(original,Archive(a),replacements)
        print(beauty.restore(folder));assert digest(a)==before
        assert not b.exists() and not m.exists()
        print('PASS: all packed files and integrity blocks; external change refusal; v1 upgrade; exact original restoration')
if __name__=='__main__':main()
