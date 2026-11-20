"use strict"

;(function connectMarketingPortal() {
  const locale = new URLSearchParams(window.location.search).get("portal")
  if (window.parent === window || (locale !== "en" && locale !== "zh")) return
  const chinese = locale === "zh"
  const root = document.getElementById("root")
  const original = new WeakMap()
  let dictionary = {}
  let catalogPlans = [
    {
      id: "pro",
      zh: "专业 5 条套餐",
      en: "Pro 5-Pack",
      tagZh: "最受欢迎",
      tagEn: "Most Popular",
      count: 5,
      price: 299,
      regular: 349,
      active: true,
    },
    {
      id: "trial",
      zh: "新用户尝鲜单条",
      en: "Starter Trial",
      tagZh: "首单尝鲜",
      tagEn: "Starter",
      count: 1,
      price: 59,
      active: true,
    },
    {
      id: "ent",
      zh: "企业 15 条套餐",
      en: "Enterprise 15-Pack",
      tagZh: "批量优惠",
      tagEn: "Best Value",
      count: 15,
      price: 765,
      regular: 899,
      active: true,
    },
  ]

  document.documentElement.lang = chinese ? "zh-CN" : "en"
  if (chinese) document.title = "NextGen Avatar · 数字人短视频制作"

  function dollars(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
  }

  function getActivePlans() {
    const active = catalogPlans.filter((item) => item && item.active !== false)
    return active.length ? active : catalogPlans
  }

  function purchaseCopy(text) {
    const active = getActivePlans()
    const lowest = active.reduce(
      (min, item) => (item.price < min ? item.price : min),
      active[0]?.price ?? 59
    )
    const planCopy = {
      "Plans starting at $497/month.": chinese
        ? "套餐 " + dollars(lowest) + " 起，单次购买。"
        : "Packages from " + dollars(lowest) + " per order.",
      "Done-for-you short-form video content featuring your digital clone. Cancel anytime.":
        chinese
          ? "选择数字人短视频套餐，单次购买，按需制作交付。"
          : "Choose a digital avatar package. One-time purchase with transparent pricing.",
      "Both plans include client approval before publishing. Pricing in USD.":
        chinese
          ? "所有套餐均包含在线审片与确认后交付无水印成片，按美元 (USD) 结算。"
          : "All packages include online review and client approval before final delivery. Pricing in USD.",
    }
    return planCopy[text]
  }

  function buildFeatures(plan) {
    const countText = chinese
      ? plan.count + " 条 1080P 高清数字人短视频"
      : plan.count +
        " short-form 1080P avatar " +
        (plan.count === 1 ? "video" : "videos")
    if (chinese) {
      return [
        countText,
        "专属数字人形象与声音复刻",
        "1 对 1 制作沟通与素材管理",
        "在线审片与修改意见反馈",
        "确认定稿后交付无水印正式成片",
      ]
    }
    return [
      countText,
      "Custom digital avatar & voice clone",
      "1-on-1 production chat & asset workspace",
      "Online video review & revision feedback",
      "Watermark-free final delivery upon approval",
    ]
  }

  function renderPricingSection() {
    const section = document.getElementById("pricing")
    if (!section) return
    const container = section.querySelector(".container")
    if (!container) return

    const existingGrid = container.querySelector("div.grid")
    if (!existingGrid) return

    const active = getActivePlans()
    const signature =
      locale +
      "::" +
      JSON.stringify(
        active.map((p) => [
          p.id,
          p.zh,
          p.en,
          p.tagZh,
          p.tagEn,
          p.count,
          p.price,
          p.regular,
        ])
      )
    if (existingGrid.dataset.nextgenRendered === signature) return

    const gridCols =
      active.length === 1
        ? "mx-auto mt-14 grid max-w-lg items-stretch gap-6 grid-cols-1"
        : active.length === 2
          ? "mx-auto mt-14 grid max-w-5xl items-stretch gap-6 lg:grid-cols-2"
          : "mx-auto mt-14 grid max-w-6xl items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3"
    existingGrid.className = gridCols

    // Highlight the plan marked popular/pro, or the first tagged plan
    const featuredId =
      active.find((p) => p.id === "pro")?.id ??
      active.find((p) => (p.tagEn || p.tagZh || "").trim())?.id ??
      active[0]?.id

    const cardsHtml = active
      .map((plan) => {
        const isFeatured = plan.id === featuredId && active.length > 1
        const name = chinese ? plan.zh || plan.en : plan.en || plan.zh
        const tag = chinese
          ? plan.tagZh || plan.tagEn || ""
          : plan.tagEn || plan.tagZh || ""
        const hasRegular =
          typeof plan.regular === "number" && plan.regular > plan.price
        const creditsLabel = chinese
          ? plan.count + " 条视频配额"
          : plan.count + (plan.count === 1 ? " VIDEO CREDIT" : " VIDEO CREDITS")
        const cadenceLabel = chinese ? "/ 单次订单" : "/ ORDER"
        const ctaLabel = chinese ? "选择此套餐" : "Choose This Plan"
        const features = buildFeatures(plan)

        const cardClass = isFeatured
          ? "relative flex flex-col rounded-2xl border-2 border-accent bg-primary p-7 text-white shadow-glow sm:p-8"
          : "relative flex flex-col rounded-2xl border border-border bg-card p-7 shadow-card sm:p-8"
        const titleClass = isFeatured
          ? "font-display text-lg font-extrabold tracking-tight text-white"
          : "font-display text-lg font-extrabold tracking-tight text-foreground"
        const priceClass = isFeatured
          ? "font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
          : "font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
        const cadenceClass = isFeatured
          ? "pb-1 text-sm font-semibold text-white/60"
          : "pb-1 text-sm font-semibold text-muted-foreground"
        const regularClass = isFeatured
          ? "pb-1 text-sm font-medium text-white/50 line-through"
          : "pb-1 text-sm font-medium text-muted-foreground line-through"
        const featureTextClass = isFeatured
          ? "flex items-start gap-2.5 text-sm text-white/85"
          : "flex items-start gap-2.5 text-sm text-foreground"
        const checkWrapClass = isFeatured
          ? "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent/30 text-accent"
          : "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"
        const btnClass = isFeatured
          ? "inline-flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-95 cursor-pointer"
          : "inline-flex w-full items-center justify-center rounded-xl border border-border bg-secondary px-6 py-3.5 text-sm font-bold text-foreground transition hover:bg-muted cursor-pointer"

        return (
          '<div class="' +
          cardClass +
          '">' +
          (tag
            ? '<span class="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-4 py-1 text-xs font-bold uppercase tracking-widest text-gold-foreground shadow-md">' +
              escapeHtml(tag) +
              "</span>"
            : "") +
          '<div class="flex items-center justify-between gap-2">' +
          '<h3 class="' +
          titleClass +
          '">' +
          escapeHtml(name) +
          "</h3></div>" +
          '<div class="mt-5 flex flex-wrap items-end gap-2">' +
          '<span class="' +
          priceClass +
          '">' +
          escapeHtml(dollars(plan.price)) +
          "</span>" +
          (hasRegular
            ? '<span class="' +
              regularClass +
              '">' +
              escapeHtml(dollars(plan.regular)) +
              "</span>"
            : "") +
          '<span class="' +
          cadenceClass +
          '">' +
          escapeHtml(cadenceLabel) +
          "</span></div>" +
          '<p class="mt-3 font-display text-sm font-bold uppercase tracking-wide text-accent">' +
          escapeHtml(creditsLabel) +
          "</p>" +
          '<ul class="mt-6 flex-1 space-y-3">' +
          features
            .map(
              (feat) =>
                '<li class="' +
                featureTextClass +
                '"><span class="' +
                checkWrapClass +
                '"><svg viewBox="0 0 24 24" class="h-2.5 w-2.5" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>' +
                escapeHtml(feat) +
                "</span></li>"
            )
            .join("") +
          "</ul>" +
          '<div class="mt-7">' +
          '<button type="button" data-nextgen-plan="' +
          escapeHtml(plan.id) +
          '" class="' +
          btnClass +
          '">' +
          escapeHtml(ctaLabel) +
          "</button></div></div>"
        )
      })
      .join("")

    existingGrid.dataset.nextgenRendered = signature
    existingGrid.innerHTML = cardsHtml
  }

  function adjustNode(node) {
    if (node.nodeType !== Node.TEXT_NODE) return
    if (
      node.parentElement &&
      node.parentElement.closest("[data-nextgen-rendered]")
    )
      return
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
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      node.closest("[data-nextgen-rendered]")
    ) {
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
        renderPricingSection()
      })
      .catch(() => {})
  }

  const observer = new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.type === "characterData") adjustNode(change.target)
      else change.addedNodes.forEach(adjustTree)
    }
    renderPricingSection()
  })
  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  adjustTree(root)
  renderPricingSection()

  window.addEventListener("message", (event) => {
    if (
      event.source !== window.parent ||
      event.origin !== window.location.origin
    )
      return
    if (
      event.data?.type !== "nextgen-marketing-catalog" ||
      !Array.isArray(event.data.plans) ||
      event.data.plans.length === 0
    )
      return
    catalogPlans = event.data.plans
    adjustTree(root)
    renderPricingSection()
  })

  // Ask parent for latest plans immediately
  window.parent.postMessage(
    { type: "nextgen-marketing-ready" },
    window.location.origin
  )

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

      const planBtn = event.target.closest("[data-nextgen-plan]")
      if (planBtn) {
        const planId = planBtn.getAttribute("data-nextgen-plan")
        if (planId) {
          event.preventDefault()
          event.stopPropagation()
          window.parent.postMessage(
            { type: "nextgen-marketing-checkout", plan: planId },
            window.location.origin
          )
          return
        }
      }

      const link = event.target.closest("a[href]")
      const href = link?.getAttribute("href")?.replace(/^#/, "")
      if (!href?.startsWith("/onboarding?")) return
      const value = new URL(href, window.location.href).searchParams.get("plan")
      const active = getActivePlans()
      const plan =
        value === "starter"
          ? active[0]?.id
          : value === "pro"
            ? (active[1]?.id ?? active[0]?.id)
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
