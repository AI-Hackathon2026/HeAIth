export interface IHashManager {
  hash(plainString: string): Promise<string>;
  compare(params: {
    plainString: string;
    hashedString: string;
  }): Promise<boolean>;
}
