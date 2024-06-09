// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ObjectToDotNotation = (obj: any, prefix: string = "", target: any = {}) => {
  Object.keys(obj).forEach((key: string) => {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      ObjectToDotNotation(obj[key], prefix + key + ".", target);
    } else {
      const dotLocation = prefix + key;
      target[dotLocation] = obj[key];
      return target;
    }
  });
  return target;
};
