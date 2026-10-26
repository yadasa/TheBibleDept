import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

test('community views keep literal text inside native Text components',()=>{
  const folder=new URL('../src/components/community/',import.meta.url);
  const files=[new URL('../src/screens/CommunityScreen.tsx',import.meta.url),...readdirSync(folder).filter(name=>name.endsWith('.tsx')).map(name=>new URL(name,folder))];
  const findings:string[]=[];
  for(const file of files){
    const source=readFileSync(file,'utf8'),tree=ts.createSourceFile(file.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    function visit(node:ts.Node){
      if(node.kind===ts.SyntaxKind.JsxText){
        const raw=source.slice(node.pos,node.end);
        let parent:ts.Node|undefined=node.parent;
        while(parent&&!ts.isJsxElement(parent))parent=parent.parent;
        const tag=parent&&ts.isJsxElement(parent)?parent.openingElement.tagName.getText(tree):undefined;
        // JSX ignores indentation/newlines, but preserves single-line spaces.
        if(tag&&tag!=='Text'&&raw.length&&(!raw.includes('\n')||raw.trim()))findings.push(`${file.pathname}:${tree.getLineAndCharacterOfPosition(node.pos).line+1} (${tag})`);
      }
      ts.forEachChild(node,visit);
    }
    visit(tree);
  }
  assert.deepEqual(findings,[],'Literal children of native View/Pressable must be wrapped in Text.');
});
