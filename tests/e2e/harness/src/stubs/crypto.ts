export const createHash = () => {
  const chunks: string[] = [];
  return {
    update(value: string) {
      chunks.push(value);
      return this;
    },
    digest() {
      return chunks.join('');
    },
  };
};
