import { Setter, createSignal, For } from "solid-js";
import InfoTab from "./info-tab";
import ScryfallSearchBox from "./scryfall-searchbox";
import type { CardListName } from "../services/power-cube-loader";

type SidebarProps = {
  language: string;
  setLanguage: Setter<string>;
  printVersos: boolean;
  setPrintVersos: Setter<boolean>;
  borderColor: string;
  setBorderColor: Setter<string>;
  onAddCard: (cardName: string) => void;
  onClearList: () => void;
  onRawListImport: (rawCardList: string) => void;
  onLoadPowerOf9: () => void;
  onLoadPowerCube: () => void;
  onLoadCardList: (listName: CardListName) => void;
  isLoading: boolean;
  loadingProgress: { current: number; total: number } | null;
  skippedCards: string[];
  onClearSkippedCards: () => void;
};

export default function Sidebar(props: SidebarProps) {
  const [rawCardListDialogOpen, setRawCardListDialogOpen] = createSignal(false);
  const [cubeMenuOpen, setCubeMenuOpen] = createSignal(false);

  const cardListNames: CardListName[] = [
    'Power of 9',
    'White',
    'Blue',
    'Black',
    'Red',
    'Green',
    'Multicolor',
    'Colorless',
    'Lands',
    'Double-Sided'
  ];

  return (
    <>
      <aside class="h-full shadow-xl overflow-y-hidden print:hidden w-full bg-stone-500">
        <div class="flex flex-col h-full gap-5 p-5">
          <label class="form-control">
            <div class="label-text text-white">
              Card language
            </div>
            <select
              name="language"
              value={props.language}
              onChange={(e) => {
                props.setLanguage(e.target.value);
              }}
              class="select"
            >
              <option value="en">English</option>
              <option value="sp">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="jp">Japanese</option>
              <option value="ko">Korean</option>
              <option value="ru">Russian</option>
              <option value="cs">Simplified Chinese</option>
              <option value="ct">Traditional Chinese</option>
              <option value="ph">Phyrexian</option>
            </select>
          </label>
          <ScryfallSearchBox
            onAddCard={({ name }) => props.onAddCard(name)}
          />
          <label class="form-control">
            <div class="label-text text-white">
              Border color
            </div>
            <select
              name="borderColor"
              value={props.borderColor}
              onChange={(e) => {
                props.setBorderColor(e.target.value);
              }}
              class="select"
            >
              <option value="black">Black</option>
              <option value="white">White</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
          </label>
          <button
            type="button"
            class="btn btn-secondary w-full"
            onClick={() => setRawCardListDialogOpen(true)}
          >
            Import from MTGO
          </button>
          
          <div class="dropdown dropdown-top w-full">
            <div 
              tabindex="0" 
              role="button" 
              class="btn btn-primary w-full"
              onClick={() => setCubeMenuOpen(!cubeMenuOpen())}
            >
              Load Power Cube List
              <svg class="fill-current" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>
            </div>
            <ul 
              tabindex="0" 
              class="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow max-h-80 overflow-y-auto flex-nowrap"
              classList={{ hidden: !cubeMenuOpen() }}
            >
              {cardListNames.map((listName) => (
                <li>
                  <button
                    onClick={() => {
                      props.onLoadCardList(listName);
                      setCubeMenuOpen(false);
                    }}
                    disabled={props.isLoading}
                  >
                    {listName}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {props.isLoading && props.loadingProgress && (
            <div class="w-full">
              <div class="text-white text-sm mb-2 text-center">
                Loading cards: {props.loadingProgress.current} / {props.loadingProgress.total}
              </div>
              <progress 
                class="progress progress-primary w-full" 
                value={props.loadingProgress.current} 
                max={props.loadingProgress.total}
              />
            </div>
          )}

          <button
            type="button"
            class="btn btn-secondary w-full"
            onClick={() => props.onClearList()}
            disabled={props.isLoading}
          >
            Clear list
          </button>
          <button
            type="button"
            class="btn btn-primary w-full"
            onClick={() => {
              print();
            }}
          >
            Print all cards
          </button>

          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text ml-auto mr-5 text-white">Print card backs</span>
              <input
                name="print-versos"
                type="checkbox"
                class="toggle toggle-primary"
                onChange={(e) => props.setPrintVersos(e.currentTarget.checked)}
                checked={props.printVersos}
              />

            </label>
          </div>

          <InfoTab />
        </div>

      </aside>

      {/* MTGO Import Dialog */}
      <dialog
        class="z-20 h-1/2 w-96 bg-stone-600 shadow-xl mt-52 rounded-lg backdrop:bg-black/50"
        open={rawCardListDialogOpen()}
      >
        <form
          method="dialog"
          class="flex flex-col h-full gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const rawCardList = (e.target as HTMLFormElement).cardList.value;
            props.onRawListImport(rawCardList);
            setRawCardListDialogOpen(false);
          }}
        >
          <label for="cardList" class="label-text text-white">
            Paste your card list here
          </label>
          <textarea
            name="cardList"
            class="textarea h-full"
          />
          <div class="w-full flex gap-2">
            <button
              class="btn btn-secondary flex-1"
              type="reset"
              onClick={() => setRawCardListDialogOpen(false)}
            >
              Cancel
            </button>
            <button class="btn btn-primary flex-1">Submit</button>
          </div>
        </form>
      </dialog>

      {/* Skipped Cards Dialog */}
      <dialog
        class="z-20 max-h-[80vh] w-96 bg-stone-600 shadow-xl mt-20 rounded-lg backdrop:bg-black/50 p-6"
        open={props.skippedCards.length > 0}
      >
        <div class="flex flex-col gap-4">
          <h3 class="text-xl font-bold text-white">Cards Not Processed</h3>
          <p class="text-white text-sm">
            The following cards could not be loaded (likely double-faced or split cards):
          </p>
          <div class="bg-stone-700 rounded p-3 max-h-60 overflow-y-auto">
            <ul class="list-disc list-inside text-white text-sm space-y-1">
              <For each={props.skippedCards}>
                {(cardName) => <li>{cardName}</li>}
              </For>
            </ul>
          </div>
          <button
            class="btn btn-primary w-full"
            onClick={() => props.onClearSkippedCards()}
          >
            OK
          </button>
        </div>
      </dialog>
    </>
  );
}
