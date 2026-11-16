// A short inline code token with no spaces (a flag like `--authorized`, a file name, a function
// name) reads wrong when the line breaks inside it: the browser happily splits after a hyphen
// or a dot and leaves "--" stranded at the end of a line. Marking those tokens lets the page
// keep each one on a single line; longer snippets with spaces can still wrap normally.
export const keepCodeTogether = (html: string) =>
  html.replace(/<code>([^<\s]{1,24})<\/code>/g, '<code class="nw">$1</code>');
