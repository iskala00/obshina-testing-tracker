export function CommunityBrand() {
	return (
		<div className="community-brand">
			<img src="/brand/community.svg" alt="" />
			<div>
				<span>Специально для</span>
				<strong>Русской Общины</strong>
			</div>
		</div>
	);
}

export function TideBackdrop() {
	return (
		<svg
			className="tide-backdrop"
			viewBox="0 0 1000 1000"
			preserveAspectRatio="none"
			aria-hidden
		>
			<defs>
				<linearGradient id="wave" x1="0%" y1="90%" x2="87%" y2="5%">
					<stop offset="0" stopColor="currentColor" stopOpacity=".13" />
					<stop offset="1" stopColor="currentColor" stopOpacity=".58" />
				</linearGradient>
			</defs>
			{['#40b6b4', '#35c6ed', '#2989ed', '#6574df'].map((color, index) => (
				<path
					key={color}
					transform={`translate(0 ${index * 105})`}
					d="M -80 540 C 180 440 300 940 540 660 C 760 450 740 120 1080 -120 L 1080 1500 L -80 1500 Z"
					color={color}
					fill="url(#wave)"
					stroke="var(--wave-edge)"
					strokeWidth="1"
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</svg>
	);
}
