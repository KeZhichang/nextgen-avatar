import { useState, type FormEvent } from "react"
import { CreditCard, Landmark, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDollars, usePortal } from "./demo"

const paymentMethods = ["card", "apple", "ach"] as const
type PaymentMethod = (typeof paymentMethods)[number]

export function CheckoutPayment({
  total,
  email,
  onPay,
}: {
  total: number
  email: string
  onPay: (method: PaymentMethod) => void
}) {
  const { t } = usePortal()
  const [method, setMethod] = useState<PaymentMethod>("card")
  const methods = {
    card: { label: t("信用卡", "Card"), icon: CreditCard },
    apple: { label: "Apple Pay", icon: Wallet },
    ach: { label: t("ACH 转账", "ACH"), icon: Landmark },
  }
  const payLabel = t(
    `支付 ${formatDollars(total)} 并创建订单`,
    `Pay ${formatDollars(total)} & create order`
  )
  const demoDescription = t(
    "测试支付环境，不会产生真实扣款。",
    "Test payment environment. No real charges will be made."
  )

  function submit(event: FormEvent<HTMLFormElement>, payment: PaymentMethod) {
    event.preventDefault()
    onPay(payment)
  }

  return (
    <Tabs
      value={method}
      onValueChange={(value) => setMethod(value as PaymentMethod)}
    >
      <TabsList
        aria-label={t("付款方式", "Payment method")}
        className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0"
      >
        {paymentMethods.map((id) => {
          const { label, icon: Icon } = methods[id]
          return (
            <TabsTrigger
              key={id}
              value={id}
              className="flex min-h-14 min-w-0 flex-col gap-1 rounded-lg border border-border bg-card px-2 py-2 text-center text-xs font-medium whitespace-normal text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/50 hover:text-foreground data-active:border-primary data-active:bg-accent data-active:text-primary data-active:shadow-none"
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>
      <TabsContent value="card" forceMount className="mt-4">
        <form autoComplete="off" onSubmit={(event) => submit(event, "card")}>
          <FieldGroup className="gap-3.5">
            <Field>
              <FieldLabel htmlFor="card-number">
                {t("卡号", "Card number")}
              </FieldLabel>
              <Input
                id="card-number"
                className="h-9 font-mono"
                inputMode="numeric"
                defaultValue="4242 4242 4242 4242"
                pattern="(?:[0-9] ?){12,18}[0-9]"
                maxLength={23}
                required
              />
            </Field>
            <div className="grid grid-cols-3 gap-2.5">
              <Field>
                <FieldLabel htmlFor="card-expiry">
                  {t("有效期", "Expiry")}
                </FieldLabel>
                <Input
                  id="card-expiry"
                  className="h-9 font-mono"
                  defaultValue="08/29"
                  pattern="(?:0[1-9]|1[0-2])/[0-9]{2}"
                  maxLength={5}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="card-cvc">CVC</FieldLabel>
                <Input
                  id="card-cvc"
                  className="h-9 font-mono"
                  inputMode="numeric"
                  defaultValue="123"
                  pattern="[0-9]{3,4}"
                  maxLength={4}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="card-postcode">
                  {t("邮编", "ZIP")}
                </FieldLabel>
                <Input
                  id="card-postcode"
                  className="h-9 font-mono"
                  inputMode="numeric"
                  defaultValue="94107"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  required
                />
              </Field>
            </div>
            <FieldDescription className="text-xs">
              {demoDescription}
            </FieldDescription>
            <Button type="submit" size="lg" className="w-full">
              {payLabel}
            </Button>
          </FieldGroup>
        </form>
      </TabsContent>
      <TabsContent value="apple" className="mt-4 flex flex-col gap-3.5">
        <FieldDescription className="text-xs">
          {t(
            "选择 Apple Pay 卡片并确认付款。",
            "Choose a card in Apple Pay to confirm payment."
          )}
        </FieldDescription>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full">
              <Wallet data-icon="inline-start" aria-hidden="true" />
              {t("继续使用 Apple Pay", "Continue with Apple Pay")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Apple Pay</DialogTitle>
              <DialogDescription>{demoDescription}</DialogDescription>
            </DialogHeader>
            <form onSubmit={(event) => submit(event, "apple")}>
              <FieldGroup className="gap-4">
                <RadioGroup
                  defaultValue="visa"
                  aria-label={t("选择测试卡", "Choose a test card")}
                >
                  <FieldLabel
                    htmlFor="wallet-visa"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/60"
                  >
                    <RadioGroupItem id="wallet-visa" value="visa" />
                    <span className="font-mono text-xs">Visa ···· 4242</span>
                  </FieldLabel>
                  <FieldLabel
                    htmlFor="wallet-mastercard"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/60"
                  >
                    <RadioGroupItem id="wallet-mastercard" value="mastercard" />
                    <span className="font-mono text-xs">
                      Mastercard ···· 4444
                    </span>
                  </FieldLabel>
                </RadioGroup>
                <Field>
                  <FieldLabel htmlFor="wallet-email">
                    {t("账单邮箱", "Billing email")}
                  </FieldLabel>
                  <Input
                    id="wallet-email"
                    className="h-9"
                    defaultValue={email}
                    type="email"
                    autoComplete="off"
                    required
                  />
                </Field>
                <Button type="submit" size="lg" className="w-full">
                  {payLabel}
                </Button>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </TabsContent>
      <TabsContent value="ach" forceMount className="mt-4">
        <form autoComplete="off" onSubmit={(event) => submit(event, "ach")}>
          <FieldGroup className="gap-3.5">
            <Field>
              <FieldLabel htmlFor="bank-holder">
                {t("账户持有人", "Account holder")}
              </FieldLabel>
              <Input
                id="bank-holder"
                className="h-9"
                defaultValue="Test Account"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bank-routing">
                {t("银行路由号码", "Routing number")}
              </FieldLabel>
              <Input
                id="bank-routing"
                className="h-9 font-mono"
                inputMode="numeric"
                defaultValue="110000000"
                pattern="[0-9]{9}"
                maxLength={9}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bank-account">
                {t("银行账号", "Account number")}
              </FieldLabel>
              <Input
                id="bank-account"
                className="h-9 font-mono"
                inputMode="numeric"
                defaultValue="000123456789"
                pattern="[0-9]{4,17}"
                maxLength={17}
                required
              />
            </Field>
            <FieldDescription className="text-xs">
              {demoDescription}
            </FieldDescription>
            <Button type="submit" size="lg" className="w-full">
              {payLabel}
            </Button>
          </FieldGroup>
        </form>
      </TabsContent>
    </Tabs>
  )
}
