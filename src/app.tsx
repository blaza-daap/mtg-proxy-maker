import {
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
} from "solid-js";
import { createStore } from "solid-js/store";
import CardComponent from "./components/card/card";
import CardVerso from "./components/card/card-verso";
import CuttingLines from "./components/cutting-lines";
import FullArtCard from "./components/card/full-art-card";
import EditCardForm from "./components/edit-card-form";
import Sidebar from "./components/sidebar";
import { parseMtgo } from "./services/mtgo-parser";
import { fetchCard } from "./services/scryfall";
import { Card, getEmptyCard } from "./types/card";
import { loadPowerOf9, type FullArtCardData } from "./services/power-of-9-loader";
import { loadCardList, type CardListName } from "./services/power-cube-loader";
import { fetchCardsWithRateLimit, fetchDoubleFacedCardsWithRateLimit } from "./services/rate-limited-fetcher";

function createResourceStore<T extends {}>(
  initialValue: T,
  ...args: Parameters<typeof createResource<T>>
) {
  const [resource] = createResource<T>(...args);
  const [store, setStore] = createStore<T>(initialValue);

  const signal = () => ({
    value: store,
    state: resource.state,
    error: resource.error,
    loading: resource.loading,
  });

  createEffect(() => {
    if (resource.latest) {
      setStore(resource.latest);
    }
  });

  return [signal, setStore] as const;
}

const borderColorMap: Record<string, string> = {
  'black': '#161410',
  'white': '#F9FAF4',
  'silver': '#C0C0C0',
  'gold': '#D4AF37'
};

export const [defaultVerso, setDefaultVerso] = createSignal<string>(localStorage.getItem('defaultVerso') || '');
export const [borderColor, setBorderColor] = createSignal<string>(localStorage.getItem('borderColor') || 'black');

// Set initial CSS variable
document.documentElement.style.setProperty('--card-bgc', borderColorMap[borderColor()]);

export default function App() {
  // Sync global state with localStorage
  createEffect(function syncWithLocalStorage() {
    localStorage.setItem("defaultVerso", defaultVerso());
  });

  createEffect(function syncBorderColorWithLocalStorage() {
    localStorage.setItem("borderColor", borderColor());
    // Update CSS variable
    document.documentElement.style.setProperty('--card-bgc', borderColorMap[borderColor()]);
  });

  const url = new URL(window.location.href);

  const rawLanguage =
    url.searchParams.get("language") ??
    localStorage.getItem("language") ??
    "en";

  const [language, setLanguage] = createSignal(rawLanguage);
  const [printVersos, setPrintVersos] = createSignal(localStorage.getItem("printVersos") == 'true');

  const [cardList, setCardList] = createResourceStore<Card[]>(
    [],
    () => getCardList(),
  );

  const [fullArtCardList, setFullArtCardList] = createSignal<FullArtCardData[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [loadingProgress, setLoadingProgress] = createSignal<{ current: number; total: number } | null>(null);
  const [skippedCards, setSkippedCards] = createSignal<string[]>([]);

  const [selectedCardIndex, setSelectedCardIndex] = createSignal<number | null>(null);

  const selectedCard = () => {
    if (selectedCardIndex() === null) return null;
    const idx = selectedCardIndex()!;
    const fullArtLength = fullArtCardList().length;
    
    // If the index is within the full-art cards range, there's no card data to edit
    if (idx < fullArtLength) return null;
    
    // Otherwise, return the card from the regular list (adjusted for offset)
    return cardList().value[idx - fullArtLength] || null;
  };

  const setSelectedCard = (fn: (prev: Card) => Card) => {
    if (selectedCardIndex() == null || selectedCard() == null) return;
    const adjustedIndex = selectedCardIndex()! - fullArtCardList().length;
    setCardList(adjustedIndex, fn(selectedCard()!));
  }

  async function fetchAndAddCard(name: string) {
    const fetchedCard = await fetchCard(
      name,
      language(),
    );

    setCardList((prev) => [...prev, fetchedCard]);
  }

  async function getNewListFromMTGO(mtgoList: string) {
    const parsedList = parseMtgo(mtgoList);

    return Promise.all(
      parsedList.flatMap(({ name, number }) =>
        [...new Array(number)].map(async (_, i) =>
          fetchCard(
            name,
            language(),
            // todo implement variant only for basic lands
            i
          ))
      ));
  }

  async function loadCardListWithProgress(listName: CardListName) {
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: 0 });
    setSkippedCards([]);
    
    try {
      if (listName === 'Power of 9') {
        // Load Power of 9 as full-art cards
        const powerOf9 = loadPowerOf9();
        setFullArtCardList(powerOf9);
        setCardList([]);
        setLoadingProgress({ current: powerOf9.length, total: powerOf9.length });
      } else if (listName === 'Double-Sided') {
        // Load double-sided cards with their back faces as verso
        const cardNames = loadCardList(listName);
        setLoadingProgress({ current: 0, total: cardNames.length });
        
        const result = await fetchDoubleFacedCardsWithRateLimit(
          cardNames,
          language(),
          (current, total) => {
            setLoadingProgress({ current, total });
          }
        );
        
        setFullArtCardList([]);
        setCardList(result.cards);
        
        // Set skipped cards if any
        if (result.skippedCards.length > 0) {
          setSkippedCards(result.skippedCards);
        }
      } else {
        // Load other lists from Scryfall with rate limiting
        const cardNames = loadCardList(listName);
        setLoadingProgress({ current: 0, total: cardNames.length });
        
        const result = await fetchCardsWithRateLimit(
          cardNames,
          language(),
          (current, total) => {
            setLoadingProgress({ current, total });
          }
        );
        
        setFullArtCardList([]);
        setCardList(result.cards);
        
        // Set skipped cards if any
        if (result.skippedCards.length > 0) {
          setSkippedCards(result.skippedCards);
        }
      }
      
      setSelectedCardIndex(null);
    } catch (error) {
      console.error('Error loading card list:', error);
    } finally {
      setIsLoading(false);
      // Keep progress visible for a moment
      setTimeout(() => setLoadingProgress(null), 2000);
    }
  }

  async function getCardList(): Promise<Card[]> {
    const urlCardList = url.searchParams.get("cardList");

    if (urlCardList) {
      window.history.replaceState(null, "", '/');
      return getNewListFromMTGO(decodeURI(urlCardList))
    } else {
      // fetch all cards from localStorage
      const rawCardList = (localStorage.getItem("cardList") ?? "[]");
      return JSON.parse(rawCardList) as Card[];
    }
  }

  createEffect(function syncWithLocalStorage() {
    if (cardList().state == "ready") {
      localStorage.setItem("cardList", JSON.stringify(cardList().value));
    }
    localStorage.setItem("language", language());
    localStorage.setItem("printVersos", printVersos() ? 'true' : 'false');
  });

  createEffect(function updateCardsLang() {
    const lang = language();
    setCardList((prev) => prev.map((c) => ({ ...c, language: lang })));
  });

  return (
    <main class="md:grid md:grid-rows-none md:grid-cols-[1fr_50rem_1fr] md:h-screen font-serif print:!block print:overflow-visible">
      <Sidebar
        onClearList={() => {
          setCardList([]);
          setFullArtCardList([]);
          setSelectedCardIndex(null);
        }}
        language={language()}
        setLanguage={setLanguage}
        printVersos={printVersos()}
        setPrintVersos={setPrintVersos}
        borderColor={borderColor()}
        setBorderColor={setBorderColor}
        onAddCard={fetchAndAddCard}
        onRawListImport={async (rawList) => {
          const newList = await getNewListFromMTGO(rawList);
          setCardList(newList);
          setFullArtCardList([]);
          setSelectedCardIndex(null);
        }}
        onLoadPowerOf9={() => {
          loadCardListWithProgress('Power of 9');
        }}
        onLoadPowerCube={() => {
          // This is now handled by the dropdown
        }}
        onLoadCardList={(listName) => {
          loadCardListWithProgress(listName);
        }}
        isLoading={isLoading()}
        loadingProgress={loadingProgress()}
        skippedCards={skippedCards()}
        onClearSkippedCards={() => setSkippedCards([])}
        totalCards={cardList().value.length + fullArtCardList().length}
      />
      <div class="relative p-5 print:p-0 h-full overflow-y-auto bg-stone-700 print:bg-white print:overflow-visible pages">
        <div class="print:m-auto" style={{ position: "relative", width: "fit-content" }}>
          {/* Cutting lines for print - positioned relative to this wrapper */}
          <CuttingLines />
          <div class="card-grid">
          {/* Render full-art cards first */}
          <For each={fullArtCardList()}>
            {(card, j) => {
              const totalIndex = j();
              return (
                <>
                  <div>
                    {[0, 1, 2].includes(totalIndex % 9) && <div class="print:mt-5" />}
                    <FullArtCard
                      artUrl={card.artUrl}
                      onClick={() => { setSelectedCardIndex(totalIndex); }}
                      selected={totalIndex == selectedCardIndex()}
                    />
                    {totalIndex % 9 == 8 && <div class="break-after-page" />}
                  </div>
                  {(totalIndex % 9 != 8 && totalIndex == fullArtCardList().length - 1 && cardList().value.length === 0) ?
                    [...new Array(8 - (totalIndex % 9))].map((_, i) =>
                      <div class="hidden print:block">
                        <CardVerso verso={undefined} />
                        {i == 7 - (totalIndex % 9) && <div class="break-after-page" />}
                      </div>
                    ) : null}

                  {printVersos() && (totalIndex % 9 == 8 || (totalIndex == fullArtCardList().length - 1 && cardList().value.length === 0)) &&
                    (
                      <>
                        {[...new Array(3)].map((_, i) => i).reverse().map((i) =>
                          <div class="hidden print:block">
                            <div class="print:mt-5" />
                            <CardVerso verso={undefined} />
                          </div>
                        )}

                        {[...new Array(3)].map((_, i) => i).reverse().map((i) =>
                          <div class="hidden print:block">
                            <CardVerso verso={undefined} />
                          </div>
                        )}

                        {[...new Array(3)].map((_, i) => i).reverse().map((i) =>
                          <div class="hidden print:block">
                            <CardVerso verso={undefined} />
                            {i % 3 == 2 && <div class="break-after-page" />}
                          </div>
                        )}
                      </>
                    )
                  }
                </>
              );
            }}
          </For>

          {/* Render regular cards */}
          <For each={cardList().value}>
            {(card, j) => {
              const totalIndex = fullArtCardList().length + j();
              return (
                <>
                  <div>
                    {[0, 1, 2].includes(totalIndex % 9) && <div class="print:mt-5" />}
                    <CardComponent
                      card={card}
                      onClick={() => { setSelectedCardIndex(totalIndex); }}
                      selected={totalIndex == selectedCardIndex()}
                    />
                    {totalIndex % 9 == 8 && <div class="break-after-page" />}
                  </div>
                  {(totalIndex % 9 != 8 && j() == cardList().value.length - 1) ?
                    [...new Array(8 - (totalIndex % 9))].map((_, i) =>
                      <div class="hidden print:block">
                        <CardVerso verso={undefined} />
                        {i == 7 - (totalIndex % 9) && <div class="break-after-page" />}
                      </div>
                    ) : null}

                  {printVersos() && (totalIndex % 9 == 8 || j() == cardList().value.length - 1) &&
                    (
                      <>
                        {[...new Array(3)].map((_, i) => i).reverse().map((i) =>
                          <div class="hidden print:block">
                            <div class="print:mt-5" />
                            <CardVerso verso={cardList().value[j() - (j() % 9) + i]?.verso} />
                          </div>
                        )}

                        {[...new Array(3)].map((_, i) => i).reverse().map((i) =>
                          <div class="hidden print:block">
                            <CardVerso verso={cardList().value[j() - (j() % 9) + i + 3]?.verso} />
                          </div>
                        )}

                        {[...new Array(3)].map((_, i) => i).reverse().map((i) =>
                          <div class="hidden print:block">
                            <CardVerso verso={cardList().value[j() - (j() % 9) + i + 6]?.verso} />
                            {i % 3 == 2 && <div class="break-after-page" />}
                          </div>
                        )}
                      </>
                    )
                  }
                </>
              );
            }}
          </For>

          <Show when={fullArtCardList().length === 0}>
            <button class="grid place-content-center shadow-xl print:hidden rounded-xl text-white bg-stone-500 hover:!bg-stone-800"
              onClick={() => {
                const nextIndex = cardList().value.length;
                setCardList((prev) => [...prev, getEmptyCard()]);
                setSelectedCardIndex(nextIndex + fullArtCardList().length);
              }}
              style={{
                position: "relative",
                height: "auto",
                width: "var(--card-width)",
                "min-width": "var(--card-width)",
                "max-width": "var(--card-width)",
                "aspect-ratio": "63/88",
                margin: "auto",
                "box-sizing": "content-box",
              }}
            >Create a custom card</button>
          </Show>
        </div>
        </div>
      </div>
      <Show when={selectedCardIndex() !== null && selectedCardIndex()! >= fullArtCardList().length && selectedCard()}>
        {(card) => <aside class="h-full overflow-y-hidden print:hidden">
          <EditCardForm
            card={card}
            setCard={setSelectedCard}
            onRemoveCard={() => {
              const adjustedIndex = selectedCardIndex()! - fullArtCardList().length;
              setCardList(cardList().value.filter((_, i) => i != adjustedIndex));
              setSelectedCardIndex(null);
            }}
            onDuplicateCard={() => {
              setCardList((prev) => [...prev, { ...card() }]);
              setSelectedCardIndex(fullArtCardList().length + cardList().value.length);
            }}
            onSetCardDefaultVerso={(url) => {
              setDefaultVerso(url);
            }}
          />

        </aside>
        }
      </Show>
    </main >
  );
}
