import sys
import os
import traceback
from moviepy.editor import *
from rembg import remove
import numpy as np

def calculate_bitrate(duration_in_seconds, target_size_in_mb=7.5):
    """Calculates the required video bitrate to achieve a target file size."""
    target_size_in_bits = target_size_in_mb * 8 * 1024 * 1024
    # Assuming audio bitrate of 128 kbps
    audio_bitrate_bits_per_second = 128 * 1024
    
    if duration_in_seconds <= 0:
        return "2000k" # Default bitrate for very short clips

    required_total_bitrate = target_size_in_bits / duration_in_seconds
    video_bitrate = required_total_bitrate - audio_bitrate_bits_per_second

    if video_bitrate <= 0:
        return "500k" # Minimum video bitrate

    return f"{int(video_bitrate / 1000)}k"

def virgilize_video(input_path, output_path, start_time, end_time):
    """
    Applies a "To be continued" meme effect to a video clip.

    Args:
        input_path (str): Path to the input video file.
        output_path (str): Path to save the final output video.
        start_time (float): Start time for the trim.
        end_time (float): End time for the trim.
    """
    temp_clip_path = None
    temp_rembg_output_path = None
    try:
        # --- 1. Load Clips ---
        print("Loading video clips...")
        input_clip = VideoFileClip(input_path).subclip(start_time, end_time)
        vergil_clip = VideoFileClip("./assets/vergil_src.mp4")

        # --- 2. Prepare Clips ---
        # Standardize resolution to match the vergil clip
        target_resolution = vergil_clip.size
        print(f"Standardizing resolution to {target_resolution}...")
        input_clip = input_clip.resize(target_resolution)

        # Split the main clip
        duration = input_clip.duration
        if duration <= 3:
            print("Clip is too short for the effect.")
            final_clip = concatenate_videoclips([input_clip, vergil_clip], method="compose")
            bitrate = calculate_bitrate(final_clip.duration)
            final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac", bitrate=bitrate)
            return

        main_part = input_clip.subclip(0, duration - 3)
        last_3_seconds = input_clip.subclip(duration - 3, duration)
        
        # --- 3. Prepare last_3_seconds for concatenation ---
        # No background removal. `last_3_seconds` is used directly.

        # --- 4. Concatenate and Finalize ---
        print("Concatenating final video...")
        final_clip = concatenate_videoclips([main_part, last_3_seconds, vergil_clip], method="compose")

        # Calculate dynamic bitrate
        bitrate = calculate_bitrate(final_clip.duration)
        print(f"Calculated target bitrate: {bitrate}")

        print(f"Writing video to: {output_path} with bitrate: {bitrate}")
        # Write the final video file
        final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac", temp_audiofile='temp-audio.m4a', remove_temp=True, bitrate=bitrate, verbose=True)

        print("Video processing complete!")

    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)
    finally:
        # --- 5. Cleanup ---
        print("Cleaning up temporary files...")
        if 'input_clip' in locals(): input_clip.close()
        if 'vergil_clip' in locals(): vergil_clip.close()
        if 'main_part' in locals(): main_part.close()
        if 'last_3_seconds' in locals(): last_3_seconds.close()
        if 'bg_removed_clip' in locals(): bg_removed_clip.close()
        
        # Safely remove temp files
        for f in ['temp-audio.m4a']:
             if f and os.path.exists(f):
                os.remove(f)

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python virgilize.py <input_file> <output_file> <start_time> <end_time>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    # Convert time from string (e.g., "M:SS" or "SS") to seconds
    def time_to_seconds(t):
        parts = t.split(':')
        if len(parts) == 1:
            return float(parts[0])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        return 0.0

    start = time_to_seconds(sys.argv[3])
    end = time_to_seconds(sys.argv[4])

    virgilize_video(input_file, output_file, start, end)