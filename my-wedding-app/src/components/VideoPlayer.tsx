interface MonacoMediaItemWithExtra {
	url: string;
	// Add other properties if needed
}

// VideoPlayerコンポーネントを追加
const VideoPlayer: React.FC<{ item: MonacoMediaItemWithExtra }> = ({
	item,
}) => {
	return (
		<div className="relative">
			<video
				src={item.url}
				className="w-full h-auto rounded-lg"
				controls
				playsInline
				preload="metadata"
			>
				Your browser does not support the video tag.
			</video>
		</div>
	);
};
export default VideoPlayer;
