
module.exports = ({ arg, searchParams, hashAlg, mtime, mode, ...options } = {}) => {
    if (searchParams) {
      options = {
        ...options,
        ...searchParams
      }
    }
  
    if (hashAlg) {
      options.hash = hashAlg
    }
  
    
  
    if (options.timeout && !isNaN(options.timeout)) {
      // server API expects timeouts as strings
      options.timeout = `${options.timeout}ms`
    }
  
    if (arg === undefined || arg === null) {
      arg = []
    } else if (!Array.isArray(arg)) {
      arg = [arg]
    }
  
    const urlSearchParams = new URLSearchParams(options)
  
    arg.forEach(arg => urlSearchParams.append('arg', arg))
  
    return urlSearchParams
  }