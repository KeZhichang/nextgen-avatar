"use strict"

;(function connectMarketingPortal() {
  const locale = new URLSearchParams(window.location.search).get("portal")
  if (window.parent === window || (locale !== "en" && locale !== "zh")) return
  const chinese = locale === "zh"
  const root = document.getElementById("root")
  const original = new WeakMap()
  let dictionary = {}
  let plans = {
    pro: {
      id: "pro",
      price: 299,
      count: 5,
      en: "Pro 5-Pack",
      zh: "专业 5 条套餐",
      tagZh: "最受欢迎",
      tagEn: "Most Popular",
    },
    ent: {
      id: "ent",
      price: 765,
      count: 15,
      en: "Enterprise 15-Pack",
      zh: "企业 15 条套餐",
      tagZh: "批量优惠",
      tagEn: "Best Value",
    },
  }

  document.documentElement.lang = chinese ? "zh-CN" : "en"
  if (chinese) document.title = "NextGen Avatar · 房地产数字人视频制作"

  function purchaseCopy(text) {
    const pro = plans.pro
    const ent = plans.ent
    const dollars = (amount) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }).format(amount)
    const credits = (plan) =>
      chinese ? plan.count + " 条视频" : plan.count + " videos"
    const tagOf = (plan) =>
      chinese ? plan.tagZh || plan.tagEn : plan.tagEn || plan.tagZh
    const planCopy = {
      "Plans starting at $497/month.": chinese
        ? "套餐 " + dollars(pro.price) + " 起，单次购买。"
        : "Packages from " + dollars(pro.price) + " per order.",
      "AGENT STARTER": pro[locale],
      "AGENT PRO": ent[locale],
      ...(tagOf(ent) ? { "MOST POPULAR": tagOf(ent) } : {}),
      "4 VIDEOS EVERY MONTH": credits(pro),
      "12 VIDEOS EVERY MONTH": credits(ent),
      "4 short-form videos per month": credits(pro),
      "12 short-form videos per month": credits(ent),
      "4 Videos — $497/month": credits(pro) + " — " + dollars(pro.price),
      "12 Videos — $997/month": credits(ent) + " — " + dollars(ent.price),
      $497: dollars(pro.price),
      $997: dollars(ent.price),
      "/ MONTH": chinese ? " / 单次订单" : " / ORDER",
      "Done-for-you short-form video content featuring your digital clone. Cancel anytime.":
        chinese
          ? "选择数字人短视频套餐，单次购买，按需续购。"
          : "Choose a digital avatar package. Buy once and reorder whenever you need more videos.",
      "Approximately 1 new video every week.": chinese
        ? "按需安排制作和交付。"
        : "Production and delivery on your schedule.",
      "Approximately 3 new videos every week.": chinese
        ? "适合批量制作和交付。"
        : "Designed for batch production and delivery.",
      "Realtor Content Clone / month": chinese
        ? "数字人制作套餐 / 单次订单"
        : "Digital avatar package / order",
      "Flat monthly rate — no surprises": chinese
        ? "每笔订单价格透明"
        : "Transparent price per order",
      "Social media scheduling": chinese ? "可下载成片" : "Downloadable videos",
      "Monthly content strategy": chinese ? "内容策划" : "Content strategy",
      "Monthly content calendar": chinese ? "制作计划" : "Production schedule",
    }
    return planCopy[text]
  }

  function adjustNode(node) {
    if (node.nodeType !== Node.TEXT_NODE) return
    const text = node.nodeValue
    const existing = original.get(node)
    const source =
      existing && existing.applied === text ? existing.source : text
    const key = source.trim()
    if (
      !key ||
      !node.parentElement ||
      node.parentElement.closest("script,style,textarea")
    )
      return
    let translated = purchaseCopy(key)
    if (key === "/ month" && node.parentElement.closest("#pricing"))
      translated = chinese ? "/ 单次订单" : "/ order"
    translated = translated ?? (chinese ? dictionary[key] : undefined)
    if (typeof translated !== "string") return
    const applied = source.replace(key, () => translated)
    original.set(node, { source, applied })
    if (text !== applied) node.nodeValue = applied
  }

  function adjustTree(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      adjustNode(node)
      return
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) adjustNode(walker.currentNode)
    if (!chinese || node.nodeType !== Node.ELEMENT_NODE) return
    for (const child of [
      node,
      ...node.querySelectorAll("[aria-label],[placeholder]"),
    ]) {
      for (const attribute of ["aria-label", "placeholder"]) {
        const value = child.getAttribute(attribute)
        if (value && typeof dictionary[value] === "string")
          child.setAttribute(attribute, dictionary[value])
      }
    }
  }

  if (chinese) {
    fetch("./zh.json")
      .then((response) => (response.ok ? response.json() : {}))
      .then((strings) => {
        dictionary = strings
        adjustTree(root)
      })
      .catch(() => {})
  }
  const observer = new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.type === "characterData") adjustNode(change.target)
      else change.addedNodes.forEach(adjustTree)
    }
  })
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  adjustTree(root)

  window.addEventListener("message", (event) => {
    if (
      event.source !== window.parent ||
      event.origin !== window.location.origin
    )
      return
    if (
      event.data?.type !== "nextgen-marketing-catalog" ||
      !Array.isArray(event.data.plans)
    )
      return
    const catalog = event.data.plans.filter((plan) => plan.active !== false)
    const pro = catalog.find((plan) => plan.id === "pro") || catalog[0]
    const ent =
      catalog.find((plan) => plan.id === "ent" && plan.id !== pro?.id) ||
      catalog.find((plan) => plan.id !== pro?.id) ||
      pro
    if (!pro || !ent) return
    plans = { pro, ent }
    adjustTree(root)
  })

  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      if (!(event.target instanceof Element)) return
      const link = event.target.closest("a[href]")
      const href = link?.getAttribute("href")?.replace(/^#/, "")
      if (!href?.startsWith("/onboarding?")) return
      const value = new URL(href, window.location.href).searchParams.get("plan")
      const plan =
        value === "starter"
          ? plans.pro.id
          : value === "pro"
            ? plans.ent.id
            : undefined
      if (!plan) return
      event.preventDefault()
      event.stopPropagation()
      window.parent.postMessage(
        { type: "nextgen-marketing-checkout", plan },
        window.location.origin
      )
    },
    { capture: true }
  )
})()
