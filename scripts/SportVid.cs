using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal sealed class SportVid : Form
{
    private readonly string root = AppDomain.CurrentDomain.BaseDirectory;
    private readonly ComboBox topics = new ComboBox();
    private readonly Button render = new Button();
    private readonly TextBox log = new TextBox();
    private Process activeRender;

    public sealed class Topic
    {
        public string id { get; set; }
        public string title { get; set; }
        public override string ToString() { return title.Replace('\n', ' '); }
    }

    public sealed class Plan
    {
        public List<Topic> topics { get; set; }
    }

    public sealed class Config
    {
        public string defaultPlan { get; set; }
    }

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        try { Application.Run(new SportVid()); }
        catch (Exception error) { MessageBox.Show(error.Message, "sportVid", MessageBoxButtons.OK, MessageBoxIcon.Error); }
    }

    private SportVid()
    {
        Text = "sportVid — Dựng video";
        ClientSize = new Size(720, 450);
        MinimumSize = new Size(610, 360);
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 10);

        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, Padding = new Padding(18), ColumnCount = 1, RowCount = 5 };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        for (int row = 0; row < 4; row++) layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        Controls.Add(layout);
        layout.Controls.Add(new Label { Text = "Chủ đề video", AutoSize = true });
        topics.Dock = DockStyle.Fill;
        topics.DropDownStyle = ComboBoxStyle.DropDownList;
        topics.Items.Add("Theo lộ trình hôm nay");
        var json = new JavaScriptSerializer();
        var config = json.Deserialize<Config>(File.ReadAllText(Path.Combine(root, "config.json")));
        foreach (Topic topic in json.Deserialize<Plan>(File.ReadAllText(Path.Combine(root, config.defaultPlan))).topics)
            topics.Items.Add(topic);
        topics.SelectedIndex = 0;
        layout.Controls.Add(topics);

        var actions = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Fill };
        render.Text = "Tạo video ngay";
        render.AutoSize = true;
        render.Click += StartRender;
        actions.Controls.Add(render);
        var open = new Button { Text = "Mở VidFinal", AutoSize = true };
        open.Click += delegate
        {
            try { Process.Start("explorer.exe", Quote(Directory.CreateDirectory(OutputFolder).FullName)); }
            catch (Exception error) { Append(error.Message); }
        };
        actions.Controls.Add(open);
        layout.Controls.Add(actions);
        layout.Controls.Add(new Label { AutoSize = true, Text = "Lưu tại " + OutputFolder });
        log.Dock = DockStyle.Fill;
        log.ReadOnly = true;
        log.Multiline = true;
        log.ScrollBars = ScrollBars.Vertical;
        layout.Controls.Add(log);
        FormClosing += delegate(object sender, FormClosingEventArgs e)
        {
            if (activeRender == null) return;
            e.Cancel = true;
            MessageBox.Show(this, "Đang dựng video. Hãy đợi quá trình hoàn tất.", "sportVid");
        };
    }

    private string OutputFolder { get { return Path.Combine(root, "VidFinal"); } }
    private static string Quote(string value) { return "\"" + value + "\""; }

    private void Append(string message)
    {
        log.AppendText(message + Environment.NewLine);
    }

    private void StartRender(object sender, EventArgs e)
    {
        var task = new Process();
        string node = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
        var start = new ProcessStartInfo
        {
            FileName = File.Exists(node) ? node : "node.exe",
            Arguments = Quote(Path.Combine(root, "scripts", "cloud-render.mjs")) + " " + Quote(OutputFolder) + " --manual",
            WorkingDirectory = root,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8
        };
        var topic = topics.SelectedItem as Topic;
        start.EnvironmentVariables["RENDER_TOPIC_ID"] = topic == null ? "" : topic.id;
        start.EnvironmentVariables.Remove("RENDER_DATE");
        start.EnvironmentVariables.Remove("RENDER_SECONDS");
        start.EnvironmentVariables.Remove("GITHUB_OUTPUT");
        task.StartInfo = start;
        render.Enabled = false;
        topics.Enabled = false;
        log.Clear();
        Append("Đang chuẩn bị hình và lời đọc…");
        try
        {
            task.OutputDataReceived += OnOutput;
            task.ErrorDataReceived += OnOutput;
            task.Start();
            activeRender = task;
            task.BeginOutputReadLine();
            task.BeginErrorReadLine();
            System.Threading.ThreadPool.QueueUserWorkItem(delegate
            {
                task.WaitForExit();
                int code = task.ExitCode;
                BeginInvoke((Action)delegate
                {
                    activeRender = null;
                    task.Dispose();
                    render.Enabled = true;
                    topics.Enabled = true;
                    Append(code == 0 ? "Đã lưu video vào VidFinal." : "Dựng chưa hoàn tất. Xem lỗi ở trên và thử lại.");
                });
            });
        }
        catch (Exception error)
        {
            activeRender = null;
            task.Dispose();
            render.Enabled = true;
            topics.Enabled = true;
            Append(error.Message);
        }
    }

    private void OnOutput(object sender, DataReceivedEventArgs e)
    {
        if (e.Data != null) BeginInvoke((Action)(() => Append(e.Data)));
    }
}
