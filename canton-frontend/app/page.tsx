import { HeroNew }   from "@/components/hero-new";
import { ValueProp }  from "@/components/value-prop";
import { Product }    from "@/components/product";
import { Pillars }    from "@/components/pillars";
import { Faq }        from "@/components/faq";
import { FinalCta }   from "@/components/final-cta";
import { Footer }     from "@/components/footer";

export default function LandingPage() {
  return (
    <>
      <HeroNew />
      <ValueProp />
      <Product />
      <Pillars />
      <Faq />
      <FinalCta />
      <Footer />
    </>
  );
}
