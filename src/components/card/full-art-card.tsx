export default function FullArtCard(
  props: { artUrl: string, onClick?: () => void, selected?: boolean }
) {
  return (
    <div
      tabIndex={0}
      onClick={props.onClick}
      class="rounded-xl print:rounded-none group outline !focus:outline outline-amber-500 print:outline-none"
      style={{
        position: "relative",
        display: "flex",
        "background-color": "var(--card-bgc, #161410)",
        height: "auto",
        width: "var(--card-width)",
        "min-width": "var(--card-width)",
        "max-width": "var(--card-width)",
        "aspect-ratio": "63/88",
        border: "var(--card-bleed) solid var(--card-bgc)",
        "outline-style": props.selected ? "solid" : "none",
        "outline-width": props.selected ? "2px" : "0px",
        margin: "auto",
        "box-sizing": "content-box",
        overflow: "hidden",
      }}
    >
      <img
        style={{
          width: "100%",
          height: "100%",
          "object-fit": "cover",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        src={props.artUrl}
      />
    </div>
  );
}
