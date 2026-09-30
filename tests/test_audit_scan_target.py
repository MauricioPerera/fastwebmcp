"""Regression oracle for the audited local/MCP secret-scan target."""
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import mcp_gate_dispatch as gd


class TestAuditScanTarget(unittest.TestCase):
    def test_default_scans_real_typescript_source(self):
        self.assertEqual(gd.build_argv('scan_secrets', {})[2:], ['src_ts'])
        with tempfile.TemporaryDirectory() as root:
            os.makedirs(os.path.join(root, 'scripts'))
            os.makedirs(os.path.join(root, 'src_ts'))
            shutil.copy(os.path.join(os.path.dirname(gd.__file__), 'scan_secrets.py'),
                        os.path.join(root, 'scripts', 'scan_secrets.py'))
            with open(os.path.join(root, 'src_ts', 'fixture.ts'), 'w', encoding='utf-8') as handle:
                handle.write('const key = "' + 'AK' + 'IA' + 'A' * 16 + '";')
            result = gd.run_gate('scan_secrets', {}, repo_root=root)
            self.assertEqual(result['exit_code'], 1)
            self.assertIn('AWS_KEY', result['stdout'])

    def test_explicit_override_is_preserved(self):
        self.assertEqual(gd.build_argv('scan_secrets', {'dirs': ['custom']})[2:], ['custom'])


if __name__ == '__main__':
    unittest.main()
