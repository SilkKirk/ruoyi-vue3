const DICT_TTL = 5 * 60 * 1000 // 字典缓存有效期 5 分钟

const useDictStore = defineStore(
  'dict',
  {
    state: () => ({
      dict: new Array()
    }),
    actions: {
      // 获取字典（带 TTL 检查，过期返回 null 触发重新拉取）
      getDict(_key) {
        if (_key == null && _key == "") {
          return null
        }
        try {
          for (let i = 0; i < this.dict.length; i++) {
            if (this.dict[i].key == _key) {
              // 检查是否过期
              if (this.dict[i].expireAt && Date.now() > this.dict[i].expireAt) {
                this.dict.splice(i, 1)
                return null
              }
              return this.dict[i].value
            }
          }
        } catch (e) {
          return null
        }
      },
      // 设置字典（带 TTL 时间戳）
      setDict(_key, value) {
        if (_key !== null && _key !== "") {
          this.dict.push({
            key: _key,
            value: value,
            expireAt: Date.now() + DICT_TTL
          })
        }
      },
      // 删除字典
      removeDict(_key) {
        var bln = false
        try {
          for (let i = 0; i < this.dict.length; i++) {
            if (this.dict[i].key == _key) {
              this.dict.splice(i, 1)
              return true
            }
          }
        } catch (e) {
          bln = false
        }
        return bln
      },
      // 清空字典
      cleanDict() {
        this.dict = new Array()
      },
      // 初始字典
      initDict() {
      }
    }
  })

export default useDictStore
