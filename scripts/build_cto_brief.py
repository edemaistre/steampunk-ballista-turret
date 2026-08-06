#!/usr/bin/env python3
"""Build the one-page CTO brief for the steampunk ballista project."""

from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path
from typing import Iterable

from PIL import Image
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "output/pdf/steampunk-ballista-cto-brief.pdf"
REFERENCE_IMAGE = ROOT / "reference/ballista-reference.png"
DEFAULT_LIVE_IMAGE = Path(
    "/Users/emmanuel/Developer/scratch/playwright-screenshots/"
    "steampunk-ballista-production-dark.png"
)

LIVE_URL = "https://ballista-production.up.railway.app"
REPO_URL = "https://github.com/edemaistre/steampunk-ballista-turret"

BG = HexColor("#0B1521")
PANEL = HexColor("#111F2D")
PANEL_ALT = HexColor("#152635")
BORDER = HexColor("#2A4051")
TEXT = HexColor("#F5F0E8")
MUTED = HexColor("#9DB0BC")
TEAL = HexColor("#48B8AA")
GOLD = HexColor("#D8A441")
CORAL = HexColor("#FF8255")
BLACK = HexColor("#081019")


def wrap_text(text: str, font: str, size: float, max_width: float) -> list[str]:
    """Wrap text to a fixed width using ReportLab font metrics."""
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if stringWidth(candidate, font, size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    font: str = "Helvetica",
    size: float = 8,
    leading: float = 10,
    color: Color = TEXT,
    max_lines: int | None = None,
) -> float:
    """Draw wrapped text and return the next baseline."""
    lines = wrap_text(text, font, size, max_width)
    if max_lines is not None:
        lines = lines[:max_lines]
    c.setFont(font, size)
    c.setFillColor(color)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_cover_image(
    c: canvas.Canvas,
    image_path: Path,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    """Crop and downsample an image for a compact, sharp PDF embedding."""
    with Image.open(image_path) as source:
        image = source.convert("RGB")
        source_ratio = image.width / image.height
        target_ratio = width / height
        if source_ratio > target_ratio:
            crop_width = round(image.height * target_ratio)
            left = (image.width - crop_width) // 2
            crop_box = (left, 0, left + crop_width, image.height)
        else:
            crop_height = round(image.width / target_ratio)
            top = (image.height - crop_height) // 2
            crop_box = (0, top, image.width, top + crop_height)

        target_pixels = (max(1, round(width * 2.5)), max(1, round(height * 2.5)))
        prepared = image.crop(crop_box).resize(target_pixels, Image.Resampling.LANCZOS)
        buffer = BytesIO()
        prepared.save(buffer, format="JPEG", quality=90, optimize=True, progressive=True)
        buffer.seek(0)
        embedded = ImageReader(buffer)
    c.drawImage(
        embedded,
        x,
        y,
        width=width,
        height=height,
        preserveAspectRatio=False,
        mask="auto",
    )


def draw_panel(
    c: canvas.Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    fill: Color = PANEL,
    border: Color = BORDER,
) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(border)
    c.setLineWidth(0.8)
    c.roundRect(x, y, width, height, 7, fill=1, stroke=1)


def draw_section(
    c: canvas.Canvas,
    number: str,
    title: str,
    bullets: Iterable[str],
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    draw_panel(c, x, y, width, height)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(x + 13, y + height - 18, number)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 34, y + height - 19, title)
    c.setStrokeColor(BORDER)
    c.line(x + 13, y + height - 27, x + width - 13, y + height - 27)

    cursor_y = y + height - 42
    for bullet in bullets:
        c.setFillColor(TEAL)
        c.circle(x + 17, cursor_y + 2.2, 1.5, fill=1, stroke=0)
        cursor_y = draw_wrapped(
            c,
            bullet,
            x + 25,
            cursor_y,
            width - 39,
            size=7.2,
            leading=9.1,
            color=TEXT,
        )
        cursor_y -= 4


def draw_metric(
    c: canvas.Canvas,
    value: str,
    label: str,
    x: float,
    y: float,
    width: float,
    height: float,
    accent: Color,
) -> None:
    draw_panel(c, x, y, width, height, fill=PANEL_ALT)
    c.setFillColor(accent)
    c.rect(x, y, 3, height, fill=1, stroke=0)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x + 12, y + 21, value)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(x + 12, y + 9, label.upper())


def draw_qr(c: canvas.Canvas, url: str, x: float, y: float, size: float) -> None:
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    qr_width = bounds[2] - bounds[0]
    qr_height = bounds[3] - bounds[1]
    drawing = Drawing(
        size,
        size,
        transform=[size / qr_width, 0, 0, size / qr_height, 0, 0],
    )
    drawing.add(qr)
    c.setFillColor(TEXT)
    c.roundRect(x - 3, y - 3, size + 6, size + 6, 4, fill=1, stroke=0)
    renderPDF.draw(drawing, c, x, y)
    c.linkURL(url, (x - 3, y - 3, x + size + 3, y + size + 3), relative=0)


def draw_stage(
    c: canvas.Canvas,
    number: str,
    title: str,
    body: str,
    x: float,
    y: float,
    width: float,
    height: float,
    accent: Color,
) -> None:
    """Draw one compact img2threejs pipeline stage."""
    draw_panel(c, x, y, width, height, fill=PANEL_ALT)
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(x + 8, y + height - 15, number)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 8.2)
    c.drawString(x + 8, y + height - 29, title)
    c.setStrokeColor(BORDER)
    c.line(x + 8, y + height - 36, x + width - 8, y + height - 36)
    draw_wrapped(
        c,
        body,
        x + 8,
        y + height - 49,
        width - 16,
        size=6.2,
        leading=7.7,
        color=MUTED,
        max_lines=5,
    )


def draw_text_column(
    c: canvas.Canvas,
    kicker: str,
    title: str,
    bullets: Iterable[str],
    x: float,
    y: float,
    width: float,
    height: float,
    accent: Color,
) -> None:
    """Draw a compact evidence column for the plugin handoff story."""
    draw_panel(c, x, y, width, height)
    c.setFillColor(accent)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(x + 13, y + height - 17, kicker)
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 13, y + height - 33, title)
    c.setStrokeColor(BORDER)
    c.line(x + 13, y + height - 42, x + width - 13, y + height - 42)

    cursor_y = y + height - 58
    for bullet in bullets:
        c.setFillColor(accent)
        c.circle(x + 17, cursor_y + 2.1, 1.5, fill=1, stroke=0)
        cursor_y = draw_wrapped(
            c,
            bullet,
            x + 25,
            cursor_y,
            width - 39,
            size=6.9,
            leading=8.7,
            color=TEXT,
        )
        cursor_y -= 3.5


def build_pdf(output: Path, live_image: Path) -> None:
    """Generate the final img2threejs-centered CTO case study."""
    output.parent.mkdir(parents=True, exist_ok=True)
    page_width, page_height = landscape(A4)
    c = canvas.Canvas(str(output), pagesize=(page_width, page_height))
    c.setTitle("img2threejs - Steampunk Ballista CTO Case Study")
    c.setAuthor("Emmanuel de Maistre")
    c.setSubject("Quality-gated image-to-procedural-3D workflow and production handoff")

    c.setFillColor(BG)
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)

    margin = 30
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(margin, page_height - 27, "IMG2THREEJS WORKFLOW CASE STUDY  /  FIELD UNIT STB-06  /  06 AUG 2026")

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 23)
    c.drawString(margin, page_height - 56, "img2threejs: one image to a production-ready interactive 3D asset")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.6)
    c.drawString(
        margin,
        page_height - 73,
        "A quality-gated, code-only reconstruction workflow with bounded autonomy, preserved evidence and an explicit human handoff",
    )

    c.setFillColor(TEAL)
    c.roundRect(page_width - 137, page_height - 38, 107, 20, 10, fill=1, stroke=0)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(page_width - 83.5, page_height - 31, "PLUGIN-CENTERED BRIEF")

    visual_y = 322
    visual_h = 184
    source_x = margin
    source_w = 142
    draw_panel(c, source_x, visual_y, source_w, visual_h)
    draw_cover_image(c, REFERENCE_IMAGE, source_x + 8, visual_y + 45, source_w - 16, visual_h - 54)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(source_x + 10, visual_y + 29, "INPUT  /  ONE REFERENCE")
    draw_wrapped(
        c,
        "Visible art direction. Hidden geometry declared approximate.",
        source_x + 10,
        visual_y + 17,
        source_w - 20,
        size=5.8,
        leading=6.7,
        color=MUTED,
        max_lines=2,
    )

    pipeline_x = source_x + source_w + 10
    pipeline_w = 466
    draw_panel(c, pipeline_x, visual_y, pipeline_w, visual_h, fill=BLACK)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 6.4)
    c.drawString(pipeline_x + 12, visual_y + visual_h - 17, "THE IMG2THREEJS BOUNDED PIPELINE")
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 7.2)
    c.drawRightString(
        pipeline_x + pipeline_w - 12,
        visual_y + visual_h - 17,
        "STAGED RECONSTRUCTION, NOT ONE-SHOT MESH GENERATION",
    )

    stage_gap = 6
    stage_w = (pipeline_w - 24 - 4 * stage_gap) / 5
    stage_y = visual_y + 49
    stage_h = 104
    stages = [
        ("01", "OBSERVE", "Macro-to-micro image analysis; visible facts separated from hidden-side inference.", GOLD),
        ("02", "CONTRACT", "Suitability, complexity, quality contract, detail inventory and PBR evidence.", TEAL),
        ("03", "SPEC", "27-component hierarchy with materials, pivots, sockets and action anchors.", CORAL),
        ("04", "BUILD", "Pass-locked TypeScript and Three.js generation with deterministic scaffolding.", GOLD),
        ("05", "REVIEW", "Browser captures, comparison sheets, diagnostics and recorded correction decisions.", TEAL),
    ]
    for index, (number, title, body, accent) in enumerate(stages):
        draw_stage(
            c,
            number,
            title,
            body,
            pipeline_x + 12 + index * (stage_w + stage_gap),
            stage_y,
            stage_w,
            stage_h,
            accent,
        )

    gate_y = visual_y + 10
    gate_h = 28
    gate_gap = 7
    gate_w = (pipeline_w - 24 - 2 * gate_gap) / 3
    gate_labels = [
        ("HARD STOP", "blockout 3/3", CORAL, TEXT),
        ("HUMAN AUTHORIZATION", "override + override v2", GOLD, BLACK),
        ("AUDIT RECORD", "state remains stopped", TEAL, BLACK),
    ]
    for index, (kicker, label, fill, foreground) in enumerate(gate_labels):
        gate_x = pipeline_x + 12 + index * (gate_w + gate_gap)
        c.setFillColor(fill)
        c.roundRect(gate_x, gate_y, gate_w, gate_h, 5, fill=1, stroke=0)
        c.setFillColor(foreground)
        c.setFont("Helvetica-Bold", 5.4)
        c.drawString(gate_x + 8, gate_y + 17, kicker)
        c.setFont("Helvetica-Bold", 7.3)
        c.drawString(gate_x + 8, gate_y + 7, label)

    result_x = pipeline_x + pipeline_w + 10
    result_w = page_width - margin - result_x
    draw_panel(c, result_x, visual_y, result_w, visual_h)
    draw_cover_image(c, live_image, result_x + 8, visual_y + 45, result_w - 16, visual_h - 54)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(result_x + 10, visual_y + 29, "OUTPUT  /  LIVE SYSTEM")
    draw_wrapped(
        c,
        "Interactive, inspectable, animation-ready and GLB-exportable.",
        result_x + 10,
        visual_y + 17,
        result_w - 20,
        size=5.8,
        leading=6.7,
        color=MUTED,
        max_lines=2,
    )

    metrics = [
        ("27/27", "specified parts built", GOLD),
        ("28", "semantic nodes", TEAL),
        ("3/3", "bounded loop hard stop", CORAL),
        ("36/36", "unit tests passed", GOLD),
        ("3/3", "browser journeys passed", TEAL),
    ]
    metric_y = 264
    metric_h = 43
    gap = 8
    metric_w = (page_width - 2 * margin - gap * (len(metrics) - 1)) / len(metrics)
    for index, (value, label, accent) in enumerate(metrics):
        draw_metric(
            c,
            value,
            label,
            margin + index * (metric_w + gap),
            metric_y,
            metric_w,
            metric_h,
            accent,
        )

    section_y = 101
    section_h = 148
    section_gap = 10
    section_w = (page_width - 2 * margin - 2 * section_gap) / 3
    draw_text_column(
        c,
        "01  /  PLUGIN OUTPUTS",
        "What img2threejs produced",
        [
            "Reference intake, suitability limits and macro-to-micro decomposition.",
            "PBR evidence, quality contract and a strict 27-component sculpt specification.",
            "Generated TypeScript scaffold, browser captures and comparison evidence.",
            "Persistent state, pass locks and review history for a reproducible audit trail.",
        ],
        margin,
        section_y,
        section_w,
        section_h,
        TEAL,
    )
    draw_text_column(
        c,
        "02  /  CONTROLLED HANDOFF",
        "The guardrail actually fired",
        [
            "After three blockout corrections, the workflow stopped at its configured limit.",
            "No state reset, silent bypass or false pass was used.",
            "Emmanuel explicitly authorized override, then override v2, with every v1 file preserved.",
            "The stopped state remains evidence of bounded autonomy, not a failed record to erase.",
        ],
        margin + section_w + section_gap,
        section_y,
        section_w,
        section_h,
        CORAL,
    )
    draw_text_column(
        c,
        "03  /  PRODUCTION HANDOFF",
        "What humans finished and proved",
        [
            "Manual V2 refinement corrected the bow, pod, chains, mechanics, controls and UI.",
            "The runtime added selection, real pivots, two-button Fire/Load logic and GLB export.",
            "Strict coverage passed at 27/27 parts, plus 36/36 unit and 3/3 browser tests.",
            "GitHub and Railway turned the audited reconstruction into a public live product.",
        ],
        margin + 2 * (section_w + section_gap),
        section_y,
        section_w,
        section_h,
        GOLD,
    )

    footer_y = 26
    footer_h = 60
    draw_panel(c, margin, footer_y, page_width - 2 * margin, footer_h, fill=BLACK)
    c.setFillColor(CORAL)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(margin + 13, footer_y + footer_h - 17, "WHY THIS MATTERS TO A CTO")
    draw_wrapped(
        c,
        "img2threejs made the process inspectable: specifications, evidence, pass state and correction limits survive the conversation. The plugin did not claim success when its gate failed. Human judgment resumed the work explicitly, while the production tests verify a different claim: that the shipped system works.",
        margin + 13,
        footer_y + footer_h - 31,
        page_width - 2 * margin - 105,
        size=6.8,
        leading=8.5,
        color=MUTED,
        max_lines=2,
    )
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(margin + 13, footer_y + 9, "LIVE")
    c.setFillColor(TEAL)
    c.drawString(margin + 42, footer_y + 9, LIVE_URL)
    c.linkURL(LIVE_URL, (margin + 40, footer_y + 5, margin + 258, footer_y + 16), relative=0)
    c.setFillColor(TEXT)
    c.drawString(margin + 303, footer_y + 9, "SOURCE")
    c.setFillColor(GOLD)
    c.drawString(margin + 348, footer_y + 9, REPO_URL)
    c.linkURL(REPO_URL, (margin + 346, footer_y + 5, margin + 605, footer_y + 16), relative=0)
    draw_qr(c, LIVE_URL, page_width - margin - 48, footer_y + 6, 42)

    c.showPage()
    c.save()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--live-image", type=Path, default=DEFAULT_LIVE_IMAGE)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    live_image = args.live_image if args.live_image.exists() else REFERENCE_IMAGE
    build_pdf(args.output, live_image)
    print(args.output)


if __name__ == "__main__":
    main()
