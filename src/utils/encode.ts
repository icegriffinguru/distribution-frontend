import BigNumber from '@elrondnetwork/erdjs/node_modules/bignumber.js/bignumber.js';

export const stringToHex = (str: string) => {
    if (str) {
      const arr1 = [];
      for (let n = 0, l = str.length; n < l; n++) {
        const hex = Number(str.charCodeAt(n)).toString(16);
        arr1.push(hex);
      }
      return arr1.join('');
    }
    return '';
};
  
export const hexToString = (strVal: string) => {
    if (strVal) {
      const hex = strVal.toString();
      let str = '';
      for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
      }
      return str;
    }
    return '';
};
  
export const base64ToHex = (str: string) => {
    const raw = atob(str);
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const hex = raw.charCodeAt(i).toString(16);
      result += hex.length === 2 ? hex : '0' + hex;
    }
    return result.toUpperCase();
};

export const decimalToHex = (dec: number | BigNumber, padding = 2) => {
    let hex = dec.toString(16);
    // make the length of hex string as even number
    if (hex.length % 2 == 1){
      hex = '0' + hex;
    }
    return hex;
};