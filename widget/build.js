const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function build() {
  // Read CSS file
  const css = fs.readFileSync(path.join(__dirname, 'src/widget.css'), 'utf-8');
  // Minify CSS (simple: remove newlines, excess whitespace)
  const minifiedCSS = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .trim();

  // Read JS and inject CSS
  let js = fs.readFileSync(path.join(__dirname, 'src/widget.js'), 'utf-8');
  js = js.replace('`WIDGET_CSS_PLACEHOLDER`', '`' + minifiedCSS + '`');

  // Write temp file with CSS inlined
  const tmpFile = path.join(__dirname, 'src/_widget_bundled.js');
  fs.writeFileSync(tmpFile, js);

  const buildOptions = {
    entryPoints: [tmpFile],
    bundle: true,
    minify: true,
    outfile: path.join(__dirname, 'dist/widget.js'),
    format: 'iife',
    target: ['es2017'],
  };

  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('👀 Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log('✅ Widget built to dist/widget.js');
    // Clean up temp file
    fs.unlinkSync(tmpFile);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
