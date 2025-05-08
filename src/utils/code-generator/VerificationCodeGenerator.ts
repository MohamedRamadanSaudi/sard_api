import * as crypto from 'crypto';


export default class VerificationCodeGenerator {
  private readonly codeLength: number;
  private readonly hashAlgorithm: string;

  constructor(codeLength: number = 4, hashAlgorithm: string = 'sha256') {
    this.codeLength = codeLength;
    this.hashAlgorithm = hashAlgorithm;
  }

  generateCode(): string {
    const code = crypto.randomInt(Math.pow(10, this.codeLength)).toString();
    return code.padStart(this.codeLength, '0');
  }

  hash(code: string): string {
    const hash = crypto.createHash(this.hashAlgorithm);
    hash.update(code);
    return hash.digest('hex');
  }

  verifyCode(code: string, input: string): boolean {
    const hashedCode = this.hash(code);
    // console.log('hashedCode', hashedCode, 'input', input);
    return hashedCode === input;
  }
}