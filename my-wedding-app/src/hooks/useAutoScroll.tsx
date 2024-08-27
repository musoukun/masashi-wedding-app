import { useEffect, useState } from "react";

const useAutoScroll = (speed: number = 1) => {
	const [isScrolling, setIsScrolling] = useState(true);

	useEffect(() => {
		let animationFrameId: number;

		const scroll = () => {
			if (isScrolling) {
				window.scrollBy(0, speed);
				animationFrameId = requestAnimationFrame(scroll);
			}
		};

		if (isScrolling) {
			animationFrameId = requestAnimationFrame(scroll);
		}

		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}, [isScrolling, speed]);

	return { isScrolling, setIsScrolling };
};

export default useAutoScroll;
