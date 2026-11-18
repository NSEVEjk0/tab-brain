import { ArrowUpRight, Download, Layers, PanelRightOpen } from "lucide-react";
import { Modal } from "./Modal";
import { BrandMark } from "./Brand";
import { publicSite } from "../constants";

export function InstallModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="A little brain beside your browser."
      eyebrow="TAKE YOUR MEMORY WITH YOU"
      onClose={onClose}
    >
      <div className="install-illustration">
        <div className="install-browser">
          <span />
          <span />
          <span />
          <div className="install-tab-stack">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="install-panel">
          <BrandMark />
          <i />
          <i />
          <i />
        </div>
      </div>
      <p className="install-intro">
        The Chrome extension saves readable text from your open tabs and keeps
        your memories in the side panel. This download is an unpacked extension
        build.
      </p>
      <a
        className="button dark download-button"
        href={`${publicSite}/downloads/tab-brain-extension.zip`}
        download
      >
        <Download size={17} />
        Download Chrome extension <ArrowUpRight size={15} />
      </a>
      <ol className="install-steps">
        <li>
          <span>1</span>
          <div>
            <strong>Unzip the download.</strong>
            <p>Keep the extracted folder somewhere easy to find.</p>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Open chrome://extensions.</strong>
            <p>Turn on Developer mode, then choose “Load unpacked”.</p>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Select the folder containing manifest.json.</strong>
            <p>Pin Tab Brain and click its icon to open your side panel.</p>
          </div>
        </li>
        <li>
          <span>4</span>
          <div>
            <strong>Make it your own.</strong>
            <p>
              Connect Firebase in settings to enable real local and cloud AI.
              Page capture and offline recall work with saved excerpts while AI
              is unconfigured.
            </p>
          </div>
        </li>
      </ol>
      <div className="install-foot">
        <PanelRightOpen size={17} />
        <span>
          Open panel: <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Y</kbd>
        </span>
        <Layers size={16} />
        <span>
          Snap current page: <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>S</kbd>
        </span>
      </div>
    </Modal>
  );
}
