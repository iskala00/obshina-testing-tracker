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

// Swift's TideBackdrop draws each band with its own pigment and gradient in canvas coordinates.
const waveColors = ['#30b0c7', '#32ade6', '#007aff', '#5856d6'];

export function TideBackdrop() {
	return (
		<svg
			className="tide-backdrop"
			viewBox="0 0 1000 1000"
			preserveAspectRatio="none"
			aria-hidden
		>
			<defs>
				{waveColors.map((color, index) => (
					<linearGradient
						key={color}
						id={`tide-${index}`}
						gradientUnits="userSpaceOnUse"
						x1="120"
						y1="950"
						x2="860"
						y2="120"
					>
						<stop offset="0" stopColor={color} className="tide-start" />
						<stop offset="1" stopColor={color} className="tide-end" />
					</linearGradient>
				))}
			</defs>
			{waveColors.map((color, index) => (
				<path
					key={color}
					transform={`translate(0 ${index * 105})`}
					d="M -80 540 C 180 440 300 940 540 660 C 760 450 740 120 1080 -120 L 1080 1500 L -80 1500 Z"
					fill={`url(#tide-${index})`}
					stroke="var(--wave-edge)"
					strokeWidth="1"
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</svg>
	);
}
