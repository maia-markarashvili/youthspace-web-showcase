import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/admin/ui";
import { verifyOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { heroSlides } from "@/lib/db/schema";
import { HeroSlideForm } from "../hero-form";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditHeroSlidePage(
  props: PageProps<"/admin/hero/[id]">,
) {
  await verifyOwner();

  const { id } = await props.params;
  /* არა-uuid → notFound, თორემ Postgres cast-შეცდომას ისვრის */
  if (!UUID_RE.test(id)) notFound();

  const [slide] = await db
    .select()
    .from(heroSlides)
    .where(eq(heroSlides.id, id));
  if (!slide) notFound();

  return (
    <>
      <PageHeader title={slide.title} description="სლაიდის რედაქტირება" />
      <HeroSlideForm defaultValues={slide} />
    </>
  );
}
