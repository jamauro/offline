export const PLACEHOLDER_USER_ID = null; // we will replace this with the real userId when auto syncing and a .keep filter is defined for the collection
export const isEmpty = obj => [Object, Array].includes((obj || {}).constructor) && !Object.entries((obj || {})).length;

export function deepReplace(input, target, replacement) {
  if (Array.isArray(input)) {
    return input.map(item => deepReplace(item, target, replacement));
  }

  if (typeof input === 'object' && input !== null) {
    const newObj = {};
    for (let key in input) {
      if (input.hasOwnProperty(key)) {
        newObj[key] = deepReplace(input[key], target, replacement);
      }
    }
    return newObj;
  }

  return input === target ? replacement : input;
}

export function deepContains(input, target) {
  if (input === target) {
    return true;
  }

  if (typeof input !== 'object' || input === null) {
    return false;
  }

  if (Array.isArray(input)) {
    for (let item of input) {
      if (deepContains(item, target)) {
        return true;
      }
    }
  } else {
    for (let key in input) {
      if (input.hasOwnProperty(key)) {
        if (deepContains(input[key], target)) {
          return true;
        }
      }
    }
  }

  return false;
}
