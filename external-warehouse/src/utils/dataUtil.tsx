
export const deepEqual = (a: any, b: any): boolean => {

  if (a === b) return true;
  
  if (a === null || b === null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  // Date
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  
  // Array
  if (a instanceof Array && b instanceof Array) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
  }
  
  // Object
  if (a instanceof Object && b instanceof Object) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
      }
      return true;
  }
  
  return false;
  };

  export const deepClone = <T extends unknown>(obj: T): T => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
    
      // Date
      if (obj instanceof Date) {
        return new Date(obj.getTime()) as T;
      }
    
      // Array
      if (obj instanceof Array) {
        return obj.map((item) => deepClone(item)) as T;
      }
    
      // Object
      if (obj instanceof Object) {
        const cloneObj = {} as Record<string, unknown>;
        Object.keys(obj).forEach((key) => {
          const currentKey = key as keyof typeof obj;
          cloneObj[key] = deepClone(obj[currentKey]);
        });
        return cloneObj as T;
      }
    
      return obj;
  };


export const normalizeJapanesePhone = (phone: string) => {
  if(!phone) return ''
  const numbers = phone.replace(/\D/g, '');
  if (/^(070|080|090)\d{8}$/.test(numbers)) {
      return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (/^(0120|0800)\d{6}$/.test(numbers)) {
      return numbers.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3');
  } else if (/^050\d{8}$/.test(numbers)) {
      return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (/^[1-9]0\d{8}$/.test(numbers)) {
      const areaCode = numbers.substring(0, numbers.length - 8);
      const rest = numbers.substring(areaCode.length);
      const firstPart = rest.substring(0, rest.length - 4);
      const lastPart = rest.substring(rest.length - 4);
      return `${areaCode}-${firstPart}-${lastPart}`;
  } else if (/^0[1-9]\d{8}$/.test(numbers)) {
      const areaCode = numbers.substring(0, numbers.length - 8);
      const rest = numbers.substring(areaCode.length);
      const firstPart = rest.substring(0, rest.length - 4);
      const lastPart = rest.substring(rest.length - 4);
      return `${areaCode}-${firstPart}-${lastPart}`;
  }
  
  return phone;
}

export const normalizeJapanesePostalCode = (postalCode: string) => {
  if(!postalCode) return ''
  const code = postalCode.replace(/\D/g, '');
  if (/^\d{7}$/.test(code)) {
      return code.replace(/(\d{3})(\d{4})/, '$1-$2');
  }
  
  return postalCode;
}