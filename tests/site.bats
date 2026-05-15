#!/usr/bin/env bats
# tests/site.bats — contract test for scripts/build-site.js
#
# Central promise: one fork-landing page per workflow JSON that parses as a
# real n8n workflow (has `name` + `nodes[]`). Test asserts:
#   - emitted index.html count == valid-workflow count
#   - each page carries the Download .json link, screenshot, problem statement
#   - re-runs are byte-identical (determinism)
#   - --dry-run produces zero side effects

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  cd "$REPO_ROOT"
}

count_valid_workflows() {
  node -e '
    const fs=require("fs"),path=require("path");
    const root=path.join(process.cwd(),"workflows");
    function walk(d,o=[]){if(!fs.existsSync(d))return o;
      for(const e of fs.readdirSync(d).sort()){
        const f=path.join(d,e);const s=fs.statSync(f);
        if(s.isDirectory())walk(f,o);else if(e.endsWith(".json"))o.push(f);
      } return o;}
    let n=0;
    for(const f of walk(root)){
      try{const p=JSON.parse(fs.readFileSync(f,"utf8"));
        if(p&&typeof p.name==="string"&&Array.isArray(p.nodes))n++;
      }catch(_){}
    }
    process.stdout.write(String(n));
  '
}

@test "build-site: page count equals valid-workflow count" {
  rm -rf dist/site
  run node scripts/build-site.js
  [ "$status" -eq 0 ]
  expected=$(count_valid_workflows)
  [ -d dist/site ]
  actual=$(find dist/site -mindepth 2 -maxdepth 2 -name index.html | wc -l | tr -d ' ')
  [ "$actual" = "$expected" ]
}

@test "build-site: every page has Download .json, screenshot, problem statement" {
  rm -rf dist/site
  node scripts/build-site.js
  for page in dist/site/*/index.html; do
    grep -q 'Download workflow .json' "$page" || {
      echo "missing download link in $page" >&2; return 1; }
    grep -q 'class="screenshot"' "$page" || {
      echo "missing screenshot in $page" >&2; return 1; }
    grep -q 'class="problem"' "$page" || {
      echo "missing problem statement in $page" >&2; return 1; }
    dir="$(dirname "$page")"
    [ -s "$dir/screenshot.svg" ] || {
      echo "missing screenshot.svg next to $page" >&2; return 1; }
    json_count=$(find "$dir" -maxdepth 1 -name '*.json' ! -name 'sample-payload.json' | wc -l | tr -d ' ')
    [ "$json_count" = "1" ] || {
      echo "expected exactly one workflow .json next to $page, got $json_count" >&2; return 1; }
  done
}

@test "build-site: re-run is byte-identical (deterministic)" {
  rm -rf dist/site
  node scripts/build-site.js
  cp -r dist/site dist/site.first
  node scripts/build-site.js
  diff -r dist/site.first dist/site
  rm -rf dist/site.first
}

@test "build-site: --dry-run does not touch the filesystem" {
  rm -rf dist/site
  run node scripts/build-site.js --dry-run
  [ "$status" -eq 0 ]
  [ ! -d dist/site ]
  echo "$output" | grep -q 'dry-run'
}
