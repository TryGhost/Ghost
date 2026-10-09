// Injects a frame's compiled stylesheet, with the site's accent colour as --brandcolor
export default function FrameStyles({ css, brandColor }) {
  const styles = brandColor ? `:root { --brandcolor: ${brandColor} }` + css : css;
  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}
