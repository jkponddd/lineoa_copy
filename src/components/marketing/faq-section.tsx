import { useTranslations } from "next-intl";

import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from "@/components/ui/accordion";

const FAQ_COUNT = 5;

export function FaqSection() {
  const t = useTranslations("marketing.faq");
  const items = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    id: `faq-${i}`,
    question: t(`q${i}`),
    answer: t(`a${i}`),
  }));

  return (
    <section id="faq" className="border-t bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h2>
        </div>

        <Accordion className="mt-8">
          {items.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionPanel>{item.answer}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
