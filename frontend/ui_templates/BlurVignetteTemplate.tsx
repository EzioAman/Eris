
import { BlurVignette, BlurVignetteArticle } from '../src/components/ui/blur-vignette';

export function Blurvignettevideo() {
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <BlurVignette
        radius="24px"
        inset="10px"
        transitionLength="100px"
        blur="15px"
        classname="h-96 w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
      >
        <video
          autoPlay={true}
          muted
          loop
          playsInline
          className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
        >
          <source
            src="https://cdn.pixabay.com/video/2023/10/19/185726-876210695_large.mp4"
            type="video/mp4"
          />
        </video>
        <BlurVignetteArticle />
      </BlurVignette>
    </div>
  );
}

export default Blurvignettevideo;
