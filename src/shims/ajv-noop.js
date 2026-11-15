// Browser stand-in for Ajv. The avatar library validates its character JSON with Ajv, which
// compiles code at runtime (new Function) and would need 'unsafe-eval' in the CSP. The only
// character it ever sees is ours, and astro.config.mjs validates it with the real Ajv at build.
export default class Ajv {
  compile() {
    const validate = () => true;
    validate.errors = null;
    return validate;
  }
}
