export function isEmptyObject(obj){
  for (let name in obj) {
    return false;
  }
  return true;
}

export function generateID() {
  function s4(){
    return Math
      .floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return `_${s4()+s4()+s4()}${s4()+s4()+s4()}`;
}

export function pruneDeep(obj){
  return function prune(current){
    for (let key in current) {
      if (current.hasOwnProperty(key)) {
        let value = current[key];
        if (typeof value === "undefined" || value == null ||
            (value != null && typeof value === "object" && isEmptyObject(prune(value)))) {
          delete current[key]
        }
      }
    }
    if (current instanceof Array) current = pruneArray(current)
    return current
  }(Object.assign({}, obj))
}

export function pruneArray(arr) {
  var newArray = new Array();
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] != null && typeof arr[i] === "object")
      arr[i] = pruneDeep(arr[i])

    if (!(typeof arr[i] === "undefined")) {
      newArray.push(arr[i]);
    }
  }
  return newArray;
}
