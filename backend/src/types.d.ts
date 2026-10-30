declare module "pdf-parse/lib/pdf-parse.js" {
  const parse: (b: Buffer) => Promise<{ text: string }>;
  export default parse;
}
