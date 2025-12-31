import { match } from "ts-pattern";
import { parseCardColor, parseCardFrame } from "../types/backgrounds";
import { Card } from "../types/card";
import { CardError } from "../types/error";
import { ManaType, isBiType, ManaLetter, manaLetters, manaLetterToType as manaLetterToTypeMap } from "../types/mana";

export function parseMana(manaCostString: string = ""): ManaType[] {
  const manaCost = manaCostString.match(/\{(.+?)\}/g) ?? [];
  return manaCost.flatMap((manaWithBraces): ManaType | ManaType[] => {
    const mana = manaWithBraces.replace("{", "").replace("}", "");
    return manaLetterToType(mana);
  });
}

export function serializeMana(manaCost: ManaType[]): string {
  const manaWithoutColorless = manaCost.filter((type) => type != "colorless");
  const entries = Object.entries(manaLetterToTypeMap) as [ManaLetter, ManaType][];

  const withoutColorless = manaWithoutColorless.map((mana) => {
    const letter = entries.find(([_letter, type]) => type == mana)?.[0];
    if (letter) {
      return `{${letter}}`;
    }
  })
    .filter((v) => v != null)
    .join("");
  const colorlessCount = manaCost.filter((type) => type == "colorless").length

  if (colorlessCount > 0) {
    return `{${colorlessCount}}${withoutColorless}`;
  } else {
    return withoutColorless;
  }
}

export function manaLetterToType(manaLetter: string): ManaType | ManaType[] {
  if (manaLetters.includes(manaLetter as ManaLetter)) {
    return manaLetterToTypeMap[manaLetter as ManaLetter];
  } else {
    return [...new Array(parseInt(manaLetter) || 0)].map(
      () => "colorless" as const
    );
  }
}

export async function fetchCard(
  title: string,
  lang = "en",
  variant: number = 0
): Promise<Card> {
  const [frCards, enCards]: [any, any] = await Promise.all([
    fetch(
      `https://api.scryfall.com/cards/search/?q=((!"${title}" lang:${lang}) or ("${title}" t:token)) -t:card order:released direction:asc`
    ).catch((e) => {
      console.error(e);
      throw new CardError(
        title,
        (
          <>
            <span>Card with name</span>
            <span class="text-xl italic text-white">{title}</span>
            <span>not found for lang {lang}</span>
          </>
        )
      );
    }),
    fetch(
      `https://api.scryfall.com/cards/search/?q=((!"${title}") or ("${title}" t:token)) -t:card order:released direction:asc`
    ).catch((e) => {
      console.error(e);
      throw new CardError(
        title,
        (
          <>
            <span>Card with name</span>
            <span class="text-xl italic text-white">{title}</span>
            <span>not found</span>
          </>
        )
      );
    }),
  ]).then(([fr, en]) => Promise.all([fr.json(), en.json()]));

  if (enCards.status == 404) {
    throw new CardError(
      title,
      (
        <>
          <span>Card with name</span>
          <span class="text-xl italic text-white">{title}</span>
          <span>not found</span>
        </>
      )
    );
  }

  if (frCards.status == 404) {
    throw new CardError(
      title,
      (
        <>
          <span>Card with name</span>
          <span class="text-xl italic text-white">{title}</span>
          <span>not found for this language ({lang})</span>
        </>
      )
    );
  }

  const fr = frCards.data.find((c: any) => c.name == title);
  const en = enCards.data.find((c: any) => c.name == title);

  if (!fr || !en) {
    throw new CardError(
      title,
      (
        <>
          <span>Card with name</span>
          <span class="text-xl italic text-white">{title}</span>
          <span>not found</span>
        </>
      )
    );
  }

  const variants = await fetchVariants(en["name"]);

  if ("card_faces" in fr) {
    throw new CardError(
      `Card ${title} is a split card`,
      (
        <>
          <span class="text-xl italic text-white">{title}</span>
          <span>Split cards are not supported (yet)</span>
        </>
      )
    );
  }

  const colorsToUse: string[] = en["type_line"].toLowerCase().includes("land")
    ? fr["color_identity"]
    : fr["colors"];
  const manaTypes = colorsToUse.flatMap(manaLetterToType);
  const manaCost = parseMana(fr["mana_cost"]);

  const card: Card = {
    title: fr["printed_name"] || fr["name"],
    manaCost,
    artUrl: en["image_uris"]?.["art_crop"],
    totalVariants: variants.length,
    aspect: {
      frame: parseCardFrame(en["type_line"]),
      color: parseCardColor(
        manaTypes,
        en["type_line"].toLowerCase().includes("artifact") &&
        !en["type_line"].toLowerCase().includes("vehicle"),
        manaCost
          .filter((type) => type != "colorless" && type != "x")
          .every(isBiType)
      ),
      legendary:
        en["frame_effects"]?.includes("legendary") ||
        en["type_line"].toLowerCase().includes("legendary"),
    },
    typeText: fr["printed_type_line"] || en["type_line"],
    oracleText: fr["printed_text"] || fr["oracle_text"],
    flavorText: fr["flavor_text"],
    power: fr["power"],
    toughness: fr["toughness"],
    artist: fr["artist"],
    collectorNumber: fr["collector_number"],
    lang: fr["lang"],
    rarity: fr["rarity"],
    set: fr["set"],
    category: en["type_line"].toLowerCase().includes("planeswalker")
      ? "Planeswalker"
      : "Regular",
    loyalty: en["loyalty"],
  };

  return {
    verso: 'default',
    ...card,
    ...variants[variant % variants.length],
  } as Card;
}

/**
 * Fetches a double-faced card from Scryfall and returns a Card object
 * with the front face as the main card and the back face as the verso.
 */
export async function fetchDoubleFacedCard(
  title: string,
  lang = "en"
): Promise<Card> {
  // For DFCs, we need to search by the front face name
  const [frCards, enCards]: [any, any] = await Promise.all([
    fetch(
      `https://api.scryfall.com/cards/search/?q=!"${title}" lang:${lang} order:released direction:asc`
    ).catch((e) => {
      console.error(e);
      throw new CardError(
        title,
        (
          <>
            <span>Double-faced card</span>
            <span class="text-xl italic text-white">{title}</span>
            <span>not found for lang {lang}</span>
          </>
        )
      );
    }),
    fetch(
      `https://api.scryfall.com/cards/search/?q=!"${title}" order:released direction:asc`
    ).catch((e) => {
      console.error(e);
      throw new CardError(
        title,
        (
          <>
            <span>Double-faced card</span>
            <span class="text-xl italic text-white">{title}</span>
            <span>not found</span>
          </>
        )
      );
    }),
  ]).then(([fr, en]) => Promise.all([fr.json(), en.json()]));

  if (enCards.status == 404) {
    throw new CardError(
      title,
      (
        <>
          <span>Double-faced card</span>
          <span class="text-xl italic text-white">{title}</span>
          <span>not found</span>
        </>
      )
    );
  }

  if (frCards.status == 404) {
    throw new CardError(
      title,
      (
        <>
          <span>Double-faced card</span>
          <span class="text-xl italic text-white">{title}</span>
          <span>not found for this language ({lang})</span>
        </>
      )
    );
  }

  // Find the card with card_faces (double-faced)
  const fr = frCards.data?.find((c: any) => c.card_faces && c.card_faces.length >= 2);
  const en = enCards.data?.find((c: any) => c.card_faces && c.card_faces.length >= 2);

  if (!fr || !en) {
    throw new CardError(
      title,
      (
        <>
          <span>Double-faced card</span>
          <span class="text-xl italic text-white">{title}</span>
          <span>not found or doesn't have two faces</span>
        </>
      )
    );
  }

  const frontFaceFr = fr.card_faces[0];
  const backFaceFr = fr.card_faces[1];
  const frontFaceEn = en.card_faces[0];
  const backFaceEn = en.card_faces[1];

  // Build front card
  const colorsToUse: string[] = frontFaceEn["type_line"]?.toLowerCase().includes("land")
    ? fr["color_identity"]
    : frontFaceFr["colors"] ?? fr["colors"] ?? [];
  const manaTypes = colorsToUse.flatMap(manaLetterToType);
  const manaCost = parseMana(frontFaceFr["mana_cost"]);

  const frontCard: Card = {
    title: frontFaceFr["printed_name"] || frontFaceFr["name"],
    manaCost,
    artUrl: frontFaceFr["image_uris"]?.["art_crop"] || fr["image_uris"]?.["art_crop"],
    totalVariants: 1,
    aspect: {
      frame: parseCardFrame(frontFaceEn["type_line"]),
      color: parseCardColor(
        manaTypes,
        frontFaceEn["type_line"]?.toLowerCase().includes("artifact") &&
        !frontFaceEn["type_line"]?.toLowerCase().includes("vehicle"),
        manaCost
          .filter((type) => type != "colorless" && type != "x")
          .every(isBiType)
      ),
      legendary:
        fr["frame_effects"]?.includes("legendary") ||
        frontFaceEn["type_line"]?.toLowerCase().includes("legendary"),
    },
    typeText: frontFaceFr["printed_type_line"] || frontFaceEn["type_line"],
    oracleText: frontFaceFr["printed_text"] || frontFaceFr["oracle_text"] || "",
    flavorText: frontFaceFr["flavor_text"] || "",
    power: frontFaceFr["power"],
    toughness: frontFaceFr["toughness"],
    artist: frontFaceFr["artist"] || fr["artist"],
    collectorNumber: fr["collector_number"],
    lang: fr["lang"],
    rarity: fr["rarity"],
    set: fr["set"],
    category: frontFaceEn["type_line"]?.toLowerCase().includes("planeswalker")
      ? "Planeswalker"
      : "Regular",
    loyalty: frontFaceFr["loyalty"],
    verso: undefined, // Will be set below
  };

  // Build back card
  const backColorsToUse: string[] = backFaceEn["type_line"]?.toLowerCase().includes("land")
    ? fr["color_identity"]
    : backFaceFr["colors"] ?? fr["colors"] ?? [];
  const backManaTypes = backColorsToUse.flatMap(manaLetterToType);
  const backManaCost = parseMana(backFaceFr["mana_cost"]);

  const backCard: Card = {
    title: backFaceFr["printed_name"] || backFaceFr["name"],
    manaCost: backManaCost,
    artUrl: backFaceFr["image_uris"]?.["art_crop"] || fr["image_uris"]?.["art_crop"],
    totalVariants: 1,
    aspect: {
      frame: parseCardFrame(backFaceEn["type_line"]),
      color: parseCardColor(
        backManaTypes,
        backFaceEn["type_line"]?.toLowerCase().includes("artifact") &&
        !backFaceEn["type_line"]?.toLowerCase().includes("vehicle"),
        backManaCost
          .filter((type) => type != "colorless" && type != "x")
          .every(isBiType)
      ),
      legendary:
        fr["frame_effects"]?.includes("legendary") ||
        backFaceEn["type_line"]?.toLowerCase().includes("legendary"),
    },
    typeText: backFaceFr["printed_type_line"] || backFaceEn["type_line"],
    oracleText: backFaceFr["printed_text"] || backFaceFr["oracle_text"] || "",
    flavorText: backFaceFr["flavor_text"] || "",
    power: backFaceFr["power"],
    toughness: backFaceFr["toughness"],
    artist: backFaceFr["artist"] || fr["artist"],
    collectorNumber: fr["collector_number"],
    lang: fr["lang"],
    rarity: fr["rarity"],
    set: fr["set"],
    category: backFaceEn["type_line"]?.toLowerCase().includes("planeswalker")
      ? "Planeswalker"
      : "Regular",
    loyalty: backFaceFr["loyalty"],
    verso: 'default',
  };

  // Set the back card as the verso of the front card
  return {
    ...frontCard,
    verso: backCard,
  } as Card;
}

export async function fetchVariants(title: string): Promise<Partial<Card>[]> {
  const response = await fetch(
    `https://api.scryfall.com/cards/search/?q=!"${title}" unique:art prefer:newest`
  ).then((r) => r.json() as any);

  return response.data
    .map((card: any, i: number, arr: any[]): Partial<Card> => {
      let partial: Partial<Card> = {
        artUrl: card["image_uris"]?.["art_crop"],
        artist: card["artist"],
        collectorNumber: card["collector_number"],
        set: card["set"],
        rarity: card["rarity"],
        totalVariants: arr.length,
      };

      if (card["type_line"]?.toLowerCase().includes("token")) {
        const manaTypes = (card["colors"] ?? card["color_identity"]).flatMap(
          manaLetterToType
        );
        const manaCost = parseMana(card["mana_cost"]);

        partial = {
          ...partial,
          typeText: card["type_line"],
          oracleText: card["printed_text"] || card["oracle_text"],
          flavorText: card["flavor_text"],
          power: card["power"],
          toughness: card["toughness"],
          aspect: {
            frame: parseCardFrame(card["type_line"]),
            color: parseCardColor(
              manaTypes,
              card["type_line"].toLowerCase().includes("artifact") &&
              !card["type_line"].toLowerCase().includes("vehicle"),
              manaCost
                .filter((type) => type != "colorless" && type != "x")
                .every(isBiType)
            ),
            legendary:
              card["frame_effects"]?.includes("legendary") ||
              card["type_line"].toLowerCase().includes("legendary"),
          },
        };
      }

      return partial;
    })
    .filter((v: any) => {
      return v?.artUrl != null;
    });
}

export async function fetchCardType(name: string): Promise<string> {
  const response = await fetch(
    `https://api.scryfall.com/cards/search/?q=!"${name}"`
  ).then((r) => r.json() as any);

  const [card] = response.data ?? [];

  return card?.["type_line"] ?? "";
}

export async function searchCard(search: string) {
  if (search.length < 3) return [];

  const response = await fetch(
    `https://api.scryfall.com/cards/search/?q=${search}`
  ).then(async (r) => {
    const json = (await r.json()) as any;
    if ("status" in json) {
      throw new Error(
        match(json.status)
          .with(404, () => "No cards found")
          .otherwise(() => "An error occured")
      );
    } else {
      return json;
    }
  });

  const result: Array<{
    name: string;
    type_line: string;
  }> = response.data;

  const deduped = result.filter(
    (card, index) => result.findIndex((c) => c.name == card.name) == index
  );

  return deduped;
}
