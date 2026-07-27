from pathlib import Path
import textwrap

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "docs" / "screenshots" / "final"
OUTPUT = ROOT / "outputs" / "proofpair-product-walkthrough.mp4"

WIDTH, HEIGHT = 1920, 1080
FPS = 20
HOLD_SECONDS = 4.3
FADE_SECONDS = 0.45

MIDNIGHT = "#002663"
BRIGHT_BLUE = "#016FD0"
ABBEY = "#4D4F53"
WHITE = "#FFFFFF"
PALE = "#F3F6FA"
GREEN = "#32C77A"

DISPLAY_FONT = "/System/Library/Fonts/NewYork.ttf"
BODY_FONT = "/System/Library/Fonts/Avenir.ttc"
BODY_BOLD_FONT = "/System/Library/Fonts/Avenir Next.ttc"


SCENES = [
    (
        "01-command-center.png",
        "Resolution command center",
        "A portfolio-level view of exposure, SLA risk, readiness, and governed coverage.",
        "6 synthetic cases · 5 active reason packs · 24/24 property checks",
    ),
    (
        "02-dispute-queue.png",
        "Operations-grade work queue",
        "Filter, prioritize, assign, select columns, and route cases by evidence state—not by a generic chat prompt.",
        "Deadline + exposure + readiness + recommended branch",
    ),
    (
        "03-case-overview.png",
        "One two-sided dispute record",
        "Member, merchant, network facts, case chronology, and analyst controls coexist in one review surface.",
        "No autonomous money movement; the analyst retains authority",
    ),
    (
        "04-evidence-room.png",
        "Source-linked evidence room",
        "Required, decisive, absent, verified, and party-submitted records stay visibly distinct.",
        "Only verified evidence can satisfy a requirement or enter scoring",
    ),
    (
        "05-evidence-inspector.png",
        "Every signal is inspectable",
        "Submitting source, supported party, verification strength, governed type weight, and ledger contribution remain traceable.",
        "25% verification × 75% type weight = 19 ledger points",
    ),
    (
        "06-decision-studio.png",
        "Deterministic decision studio",
        "Version-pinned controls expose the exact arithmetic and every pass/review gate behind the recommendation.",
        "Required evidence · deadline · contradiction · decisive evidence · score gap",
    ),
    (
        "07-decision-receipt.png",
        "Audit-ready decision receipt",
        "A portable explanation packages the policy version, control outcomes, parties, amount, and recommended next step.",
        "Recommendation only—no account action is available",
    ),
    (
        "08-counterfactual-conflict.png",
        "Counterfactual: introduce conflict",
        "The same evidence scores are preserved, but an unresolved contradiction forces the specialist branch.",
        "Fail-closed behavior is visible and testable",
    ),
    (
        "09-counterfactual-abstention.png",
        "Counterfactual: remove evidence",
        "When a required verified record disappears, the engine abstains instead of manufacturing confidence.",
        "Required Evidence Complete → REVIEW",
    ),
    (
        "10-specialist-route.png",
        "A genuinely ambiguous case",
        "DP-20837 carries strong evidence on both sides and an unresolved custody conflict, so escalation is the correct output.",
        "Ambiguity is preserved—not polished away",
    ),
    (
        "11-communications.png",
        "Controlled two-party outreach",
        "Analysts can switch audiences, draft evidence requests, and set response deadlines inside the case context.",
        "Prototype-safe: messages queue locally and are never sent externally",
    ),
    (
        "12-audit-trail.png",
        "Immutable-intent event history",
        "Case creation, evidence normalization, conflict checking, and recommendation creation form one readable trace.",
        "Four behavioral checks are attached to the decision path",
    ),
    (
        "13-portfolio-intelligence.png",
        "Portfolio intelligence without fake ROI",
        "Reason-code workload, exposure, readiness, routing, and human-attention cases are summarized honestly.",
        "No savings, accuracy, or cycle-time claim is inferred from synthetic data",
    ),
    (
        "14-governance-controls.png",
        "Controls before automation",
        "Six cases each pass invariance, monotonicity, abstention, and role-swap symmetry under versioned rule packs.",
        "24/24 synthetic property checks · proxy risk remains explicitly open",
    ),
    (
        "15-policy-change-log.png",
        "Versioned policy registry",
        "Reason-code packs carry visible versions and change history so decisions can be reproduced and reviewed.",
        "Production intent adds approval identity, signed artifacts, and rollback",
    ),
    (
        "16-notifications.png",
        "Operational attention system",
        "SLA and conflict notifications lead directly to the correct evidence or decision workspace.",
        "Actionable alerts—not decorative dashboard noise",
    ),
    (
        "17-mobile-command-center.png",
        "Responsive operations shell",
        "Priority actions, metrics, navigation, and typography remain legible at a narrow breakpoint.",
        "Verified at a 390 × 844 device viewport",
    ),
    (
        "18-mobile-case.png",
        "The case workflow travels",
        "Case identity, amount, SLA, reason code, workspace tabs, and narrative remain usable on mobile.",
        "The desktop information hierarchy survives—not merely shrinks",
    ),
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    chosen_font: ImageFont.FreeTypeFont,
    fill: str,
    width: int,
    spacing: int = 10,
) -> int:
    x, y = xy
    lines = textwrap.wrap(text, width=width)
    draw.multiline_text((x, y), "\n".join(lines), font=chosen_font, fill=fill, spacing=spacing)
    bbox = draw.multiline_textbbox((x, y), "\n".join(lines), font=chosen_font, spacing=spacing)
    return bbox[3]


def fit_image(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    candidate = image.copy()
    candidate.thumbnail(box, Image.Resampling.LANCZOS)
    return candidate


def compose_scene(scene_index: int, scene: tuple[str, str, str, str]) -> Image.Image:
    filename, title, body, proof = scene
    frame = Image.new("RGB", (WIDTH, HEIGHT), PALE)
    draw = ImageDraw.Draw(frame)

    draw.rectangle((0, 0, WIDTH, 92), fill=WHITE)
    draw.rectangle((0, 0, 16, 92), fill=BRIGHT_BLUE)
    draw.text((44, 24), "PROOFPAIR", font=font(BODY_BOLD_FONT, 24), fill=MIDNIGHT)
    draw.text((205, 28), "LIVE PRODUCT WALKTHROUGH", font=font(BODY_FONT, 18), fill=ABBEY)
    draw.text(
        (WIDTH - 174, 27),
        f"{scene_index:02d} / {len(SCENES):02d}",
        font=font(BODY_BOLD_FONT, 20),
        fill=BRIGHT_BLUE,
    )

    screenshot = Image.open(SCREENSHOTS / filename).convert("RGB")
    if screenshot.width < 600:
        stage = Image.new("RGB", (1324, 918), MIDNIGHT)
        mobile = fit_image(screenshot, (560, 846))
        mx = (stage.width - mobile.width) // 2
        my = (stage.height - mobile.height) // 2
        stage.paste(mobile, (mx, my))
        screenshot = stage
    else:
        screenshot = fit_image(screenshot, (1324, 918))

    sx, sy = 32, 124
    draw.rounded_rectangle((sx - 4, sy - 4, sx + 1332, sy + 926), radius=10, fill="#D9E2ED")
    px = sx + (1324 - screenshot.width) // 2
    py = sy + (918 - screenshot.height) // 2
    frame.paste(screenshot, (px, py))

    panel_x = 1390
    draw.rectangle((panel_x, 124, WIDTH - 32, 1042), fill=WHITE)
    draw.rectangle((panel_x, 124, panel_x + 10, 1042), fill=BRIGHT_BLUE)
    draw.text(
        (panel_x + 42, 164),
        "REAL PROTOTYPE BEHAVIOR",
        font=font(BODY_BOLD_FONT, 17),
        fill=BRIGHT_BLUE,
    )
    title_bottom = draw_wrapped(
        draw,
        (panel_x + 42, 214),
        title,
        font(DISPLAY_FONT, 45),
        MIDNIGHT,
        width=18,
        spacing=8,
    )
    draw.line((panel_x + 42, title_bottom + 38, WIDTH - 72, title_bottom + 38), fill=MIDNIGHT, width=2)
    body_bottom = draw_wrapped(
        draw,
        (panel_x + 42, title_bottom + 76),
        body,
        font(BODY_FONT, 24),
        ABBEY,
        width=30,
        spacing=12,
    )

    proof_y = max(body_bottom + 62, 690)
    draw.text((panel_x + 42, proof_y), "VERIFIED DETAIL", font=font(BODY_BOLD_FONT, 17), fill=ABBEY)
    draw.ellipse((panel_x + 42, proof_y + 42, panel_x + 58, proof_y + 58), fill=GREEN)
    draw_wrapped(
        draw,
        (panel_x + 76, proof_y + 28),
        proof,
        font(BODY_BOLD_FONT, 21),
        MIDNIGHT,
        width=29,
        spacing=9,
    )

    draw.text(
        (panel_x + 42, 990),
        "proofpair-amex.vercel.app",
        font=font(BODY_FONT, 18),
        fill=BRIGHT_BLUE,
    )
    return frame


def crossfade(a: np.ndarray, b: np.ndarray, alpha: float) -> np.ndarray:
    return np.clip(a * (1.0 - alpha) + b * alpha, 0, 255).astype(np.uint8)


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    rendered = [np.asarray(compose_scene(index + 1, scene)) for index, scene in enumerate(SCENES)]
    hold_frames = int(HOLD_SECONDS * FPS)
    fade_frames = int(FADE_SECONDS * FPS)

    writer = imageio.get_writer(
        OUTPUT,
        fps=FPS,
        codec="libx264",
        quality=8,
        pixelformat="yuv420p",
        macro_block_size=8,
        ffmpeg_log_level="warning",
    )
    try:
        for index, current in enumerate(rendered):
            for _ in range(hold_frames):
                writer.append_data(current)
            if index < len(rendered) - 1:
                following = rendered[index + 1]
                for step in range(1, fade_frames + 1):
                    writer.append_data(crossfade(current, following, step / (fade_frames + 1)))
        for _ in range(int(1.7 * FPS)):
            writer.append_data(rendered[-1])
    finally:
        writer.close()


if __name__ == "__main__":
    build()
