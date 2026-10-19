import { Image } from "expo-image";
export function BrandLogo({ large = false }: { large?: boolean }) {
  // Original navbar artwork, bundled locally so the app header works offline.
  return (
    <Image
      source={require("../../assets/bibledept-navbar-logo.avif")}
      accessibilityLabel="The Bible Dept."
      accessible
      contentFit="contain"
      style={{
        width: large ? 208 : 128,
        height: ((large ? 208 : 128) * 229) / 580,
      }}
    />
  );
}
