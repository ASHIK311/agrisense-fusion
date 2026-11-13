"""
Download the heavy Sentinel-2 GeoTIFF rasters, trained models (.pkl), and
national 1981-2024 climate archive from Hugging Face (`ashik1236/nasatest`)
into the local workspace.
"""
import os
import sys

def main():
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("huggingface_hub is not installed. Installing or run: pip install huggingface_hub")
        sys.exit(1)

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_dir = os.path.join(repo_root, "research", "hf_datasets")
    os.makedirs(target_dir, exist_ok=True)

    print("Downloading ashik1236/nasatest dataset (~2.80 GB) to:", target_dir)
    snapshot_download(
        repo_id="ashik1236/nasatest",
        repo_type="dataset",
        local_dir=target_dir,
        local_dir_use_symlinks=False
    )
    print("Download complete!")

if __name__ == "__main__":
    main()
