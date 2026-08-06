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


def build_pdf(output: Path, live_image: Path) -> None:
    """Generate the final single-page CTO briefing PDF."""
    output.parent.mkdir(parents=True, exist_ok=True)
    page_width, page_height = landscape(A4)
    c = canvas.Canvas(str(output), pagesize=(page_width, page_height))
    c.setTitle("Steampunk Ballista Turret - CTO Brief")
    c.setAuthor("Emmanuel de Maistre")
    c.setSubject("Single-page technical delivery summary")

    c.setFillColor(BG)
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)

    margin = 30
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(margin, page_height - 28, "FIELD UNIT STB-06  /  CTO DELIVERY BRIEF  /  06 AUG 2026")

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 25)
    c.drawString(margin, page_height - 57, "From one image to a production-ready interactive 3D asset")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(
        margin,
        page_height - 75,
        "Steampunk Ballista Turret  |  Vite + TypeScript + Three.js  |  Procedural geometry, mechanics, QA and deployment",
    )

    c.setFillColor(TEAL)
    c.roundRect(page_width - 125, page_height - 38, 95, 20, 10, fill=1, stroke=0)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(page_width - 77.5, page_height - 31, "LIVE + VERIFIED")

    pipeline_y = page_height - 94
    pipeline = [
        "REFERENCE",
        "IMG2THREEJS GATES",
        "MANUAL V2 REFINEMENT",
        "AUTOMATED QA",
        "GITHUB + RAILWAY",
    ]
    pipeline_x = margin
    c.setFont("Helvetica-Bold", 6.3)
    for index, label in enumerate(pipeline):
        label_width = stringWidth(label, "Helvetica-Bold", 6.3)
        c.setFillColor(GOLD if index == 0 else TEAL)
        c.drawString(pipeline_x, pipeline_y, label)
        pipeline_x += label_width + 9
        if index < len(pipeline) - 1:
            c.setStrokeColor(BORDER)
            c.setLineWidth(1)
            c.line(pipeline_x, pipeline_y + 2, pipeline_x + 18, pipeline_y + 2)
            c.setFillColor(BORDER)
            c.circle(pipeline_x + 18, pipeline_y + 2, 1.8, fill=1, stroke=0)
            pipeline_x += 27

    visual_y = 332
    visual_h = 166
    source_x = margin
    source_w = 180
    draw_panel(c, source_x, visual_y, source_w, visual_h)
    draw_cover_image(c, REFERENCE_IMAGE, source_x + 8, visual_y + 27, source_w - 16, visual_h - 35)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(source_x + 10, visual_y + 11, "INPUT  /  SINGLE STYLIZED REFERENCE")

    result_x = 225
    result_w = 355
    draw_panel(c, result_x, visual_y, result_w, visual_h)
    draw_cover_image(c, live_image, result_x + 8, visual_y + 27, result_w - 16, visual_h - 35)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(result_x + 10, visual_y + 11, "OUTPUT  /  LIVE INTERACTIVE BROWSER ASSET")

    c.setStrokeColor(CORAL)
    c.setLineWidth(2)
    c.line(source_x + source_w + 7, visual_y + visual_h / 2, result_x - 7, visual_y + visual_h / 2)
    c.setFillColor(CORAL)
    c.circle(result_x - 7, visual_y + visual_h / 2, 2.5, fill=1, stroke=0)

    summary_x = 596
    summary_w = page_width - margin - summary_x
    draw_panel(c, summary_x, visual_y, summary_w, visual_h, fill=PANEL_ALT)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(summary_x + 14, visual_y + visual_h - 19, "EXECUTIVE SUMMARY")
    summary_y = draw_wrapped(
        c,
        "Starting from one stylized render, we built a complete code-generated 3D asset and inspection experience. The final system includes mechanical state, semantic metadata, export, automated QA, and a live public deployment.",
        summary_x + 14,
        visual_y + visual_h - 39,
        summary_w - 28,
        size=8.2,
        leading=11,
        color=TEXT,
    )
    c.setStrokeColor(BORDER)
    c.line(summary_x + 14, summary_y - 1, summary_x + summary_w - 14, summary_y - 1)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(summary_x + 14, summary_y - 18, "OUTCOME")
    draw_wrapped(
        c,
        "Code-only model. No runtime secrets. No third-party 3D asset. Production URL returns HTTP 200.",
        summary_x + 14,
        summary_y - 32,
        summary_w - 28,
        size=7.5,
        leading=10,
        color=MUTED,
    )

    metrics = [
        ("245", "mesh instances", GOLD),
        ("16,062", "triangle faces", TEAL),
        ("28", "semantic nodes", CORAL),
        ("36/36", "unit tests", GOLD),
        ("3/3", "browser journeys", TEAL),
        ("1", "production deploy", CORAL),
    ]
    metric_y = 275
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

    section_y = 104
    section_h = 153
    section_gap = 10
    section_w = (page_width - 2 * margin - 2 * section_gap) / 3
    draw_section(
        c,
        "01",
        "What we engineered",
        [
            "Procedural geometry and PBR-style materials authored in TypeScript.",
            "28-node semantic hierarchy, four sockets, colliders and destruction groups.",
            "Real yaw and pitch pivots, raycast selection and exploded view.",
            "Browser-native binary GLB export and a responsive control surface.",
        ],
        margin,
        section_y,
        section_w,
        section_h,
    )
    draw_section(
        c,
        "02",
        "Critical refinements",
        [
            "Corrected bow sweep and tangent-aligned endpoint clamps.",
            "Closed the pod underside, rebuilt chains and added bilateral fasteners.",
            "Separated Fire from Crank & Load with an explicit four-state cycle.",
            "Centered pitch and yaw, completed Reset and removed the conflicting scope.",
        ],
        margin + section_w + section_gap,
        section_y,
        section_w,
        section_h,
    )
    draw_section(
        c,
        "03",
        "Production delivery",
        [
            "36 Vitest tests plus three Playwright interaction and visual journeys.",
            "GitHub Actions runs typecheck, build, Chromium and evidence retention.",
            "Railway uses one healthy deployment, healthchecks and path-filtered updates.",
            "Dark and light desktop, 390 px mobile, reference modal and GLB verified.",
        ],
        margin + 2 * (section_w + section_gap),
        section_y,
        section_w,
        section_h,
    )

    footer_y = 26
    footer_h = 60
    draw_panel(c, margin, footer_y, page_width - 2 * margin, footer_h, fill=BLACK)
    c.setFillColor(CORAL)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(margin + 13, footer_y + footer_h - 17, "TRUST BOUNDARY")
    draw_wrapped(
        c,
        "Single-image reconstruction: hidden geometry is an informed approximation. Projectile travel is deterministic animation, not rigid-body physics. The GLB omits procedural roughness DataTextures. No database, API key or runtime secret is required.",
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
