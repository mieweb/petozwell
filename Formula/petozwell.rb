class Petozwell < Formula
  desc "Install Ozwell, the yellow octopus pet for Codex desktop"
  homepage "https://github.com/mieweb/petozwell"
  url "https://github.com/mieweb/petozwell/releases/download/v1.0.0/petozwell-1.0.0.tgz"
  sha256 "210d5995a0468f0d0859c9329a8c4ffddc25e887fc688cc69e68b7c8585a3827"
  license :cannot_represent

  depends_on "node"

  def install
    libexec.install "bin", "lib", "ozwell", "package.json"
    (bin/"petozwell").write <<~SH
      #!/bin/sh
      exec "#{Formula["node"].opt_bin}/node" "#{libexec}/bin/petozwell.js" "$@"
    SH
  end

  def caveats
    <<~EOS
      Run petozwell to install Ozwell into your Codex pets folder.
      Then open Settings > Pets > Refresh and select Ozwell.
      The installer honors CODEX_HOME, or accepts --codex-home PATH.
      To replace an existing version while keeping a backup, run:
        petozwell --force
    EOS
  end

  test do
    codex_home = testpath/"codex home"
    system bin/"petozwell", "--codex-home", codex_home
    manifest = codex_home/"pets/ozwell/pet.json"
    assert_predicate manifest, :exist?
    assert_equal "Ozwell", JSON.parse(manifest.read).fetch("displayName")
    assert_predicate codex_home/"pets/ozwell/spritesheet.png", :exist?
    assert_match "already installed", shell_output("#{bin}/petozwell --codex-home '#{codex_home}'")
  end
end
