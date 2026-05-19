package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.Assignment;
import com.smartlearning.backend.entity.ClassGroup;
import com.smartlearning.backend.entity.Conversation;
import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.entity.Model;
import com.smartlearning.backend.entity.Submission;
import com.smartlearning.backend.entity.Template;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.AssignmentRepository;
import com.smartlearning.backend.repository.ClassGroupRepository;
import com.smartlearning.backend.repository.ConversationRepository;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.ModelRepository;
import com.smartlearning.backend.repository.SubmissionRepository;
import com.smartlearning.backend.repository.TemplateRepository;
import com.smartlearning.backend.repository.UserRepository;
import com.smartlearning.backend.util.ModelConfigUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@Profile("demo")
@Order(20)
public class DemoSeeder implements CommandLineRunner {

    private static final String DEMO_MARKER_TITLE = "[演示] 人物角色构图";
    private static final String MODEL_GPT_IMAGE = "gpt-image-2";
    private static final String MODEL_DALLE3 = "dall-e-3";
    private static final String MODEL_GEMINI = "gemini/gemini-3.1-flash-image-preview";

    @Autowired private UserRepository userRepository;
    @Autowired private AssignmentRepository assignmentRepository;
    @Autowired private SubmissionRepository submissionRepository;
    @Autowired private GenerationRepository generationRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private TemplateRepository templateRepository;
    @Autowired private ModelRepository modelRepository;
    @Autowired private ClassGroupRepository classGroupRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbcTemplate;

    private static final String[][] ROSTER = {
            {"linyutong", "李雨桐"},   {"zhangzixuan", "张子轩"}, {"wangzihan", "王梓涵"},  {"chensiyuan", "陈思远"},
            {"liuxinyi", "刘欣怡"},    {"zhouhaoran", "周浩然"},  {"wuyutong", "吴语桐"},   {"zhengmingxuan", "郑明轩"},
            {"zhaowanqing", "赵婉清"}, {"sunruotong", "孙若彤"},  {"qianyize", "钱亦泽"},   {"yuxiaobei", "俞晓贝"},
            {"hanmuyao", "韩沐瑶"},    {"luoyichen", "罗一辰"},   {"liangshuyu", "梁书煜"}, {"hujiaxin", "胡嘉欣"},
            {"xushiqi", "徐诗琪"},     {"shenyutong", "沈语彤"},  {"yangchenxi", "杨晨曦"}, {"caoyifeng", "曹奕枫"},
            {"feijingxuan", "费靖萱"}, {"daimuyang", "戴沐阳"},   {"jiangzihan", "蒋梓涵"}, {"baizhihao", "白志豪"},
            {"sunxiaomeng", "孙小萌"}, {"liuziqi", "刘梓琪"},     {"taoyichen", "陶逸辰"},  {"xiaolinghui", "萧凌慧"},
            {"renxiyao", "任熹瑶"},    {"hexinran", "何欣然"},    {"luozhiyan", "骆芷妍"},  {"shaoyifei", "邵奕菲"},
            {"chuqingci", "褚清辞"},   {"weifuxin", "魏抚心"},    {"tanjingyu", "谭婧瑜"},  {"miaohanxue", "缪含雪"},
            {"keyiqian", "柯亦谦"},    {"liyiwen", "厉以文"},     {"guhanyu", "顾涵予"},    {"yuwenqi", "虞文琪"}
    };

    @Override
    public void run(String... args) {
        wipeDemoData();

        ensureModels();
        User teacher = ensureTeacher();
        List<ClassGroup> classes = seedClasses(teacher);
        List<User> students = seedStudents(teacher, classes);
        seedTemplates(teacher);
        List<Assignment> assignments = seedAssignments(teacher);
        seedSubmissions(students, assignments);
        seedFreeGenerations(students);

        System.out.println("✅ 演示数据已注入：");
        System.out.println("  · 班级 " + classes.size() + " 个");
        System.out.println("  · 学生 " + students.size() + " 人（默认密码 123456）");
        System.out.println("  · 作业 " + assignments.size() + " 个（含进行中/已结束/限时挑战）");
        System.out.println("  · 提交 " + submissionRepository.count() + " 条 / 生成记录 " + generationRepository.count() + " 条");
    }

    // 每次启动先清掉旧的演示数据（仅 ROSTER 学生 + teacher 名下的作业 + [演示] 模板），
    // 不影响默认 student 账号或非演示数据。
    @Transactional
    public void wipeDemoData() {
        java.util.Optional<User> teacherOpt = userRepository.findByUsername("teacher");

        teacherOpt.ifPresent(t -> {
            jdbcTemplate.update(
                "DELETE FROM submissions WHERE assignment_id IN (SELECT id FROM assignments WHERE teacher_id = ?)",
                t.getId());
            jdbcTemplate.update("DELETE FROM assignments WHERE teacher_id = ?", t.getId());
            jdbcTemplate.update(
                "DELETE FROM templates WHERE teacher_id = ? AND title LIKE '[演示]%'",
                t.getId());
            jdbcTemplate.update("DELETE FROM class_groups WHERE teacher_id = ?", t.getId());
        });

        List<String> usernames = new ArrayList<>();
        for (String[] row : ROSTER) usernames.add(row[0]);
        if (usernames.isEmpty()) return;

        String placeholders = String.join(",", java.util.Collections.nCopies(usernames.size(), "?"));
        Object[] args = usernames.toArray();

        List<String> demoStudentIds = jdbcTemplate.queryForList(
            "SELECT id FROM users WHERE username IN (" + placeholders + ")",
            String.class, args);

        if (!demoStudentIds.isEmpty()) {
            String idPlaceholders = String.join(",", java.util.Collections.nCopies(demoStudentIds.size(), "?"));
            Object[] idArgs = demoStudentIds.toArray();
            jdbcTemplate.update("DELETE FROM submissions WHERE student_id IN (" + idPlaceholders + ")", idArgs);
            jdbcTemplate.update("DELETE FROM generations WHERE user_id IN (" + idPlaceholders + ")", idArgs);
            jdbcTemplate.update("DELETE FROM conversations WHERE user_id IN (" + idPlaceholders + ")", idArgs);
        }
    }

    // ---------- Models ----------
    private void ensureModels() {
        upsertModel(MODEL_GPT_IMAGE, "智绘大师 2", "BOTH", "openai", "高质量 AI 生图与编辑");
        upsertModel(MODEL_DALLE3, "创意画坊 3", "TEXT_TO_IMAGE", "openai", "经典生图模型");
        upsertModel(MODEL_GEMINI, "灵感闪绘", "TEXT_TO_IMAGE", "google", "高速生图模型");
        upsertModel("deepseek-v4-flash", "深度思考 V4", "TEXT_GENERATION", "deepseek", "高速文本分析与导师对话");
        upsertModel("qwen-vl-max", "通义千问 VL", "TEXT_GENERATION", "alibaba", "原生多模态导师对话与作品评审");
        upsertModel("qwen3.5-plus", "通义千问 3.5", "TEXT_GENERATION", "alibaba", "高质量中文对话与导师辅导");
        upsertModel("gpt-4o", "智析多模态 4o", "TEXT_GENERATION", "openai", "多模态分析与导师对话");
        upsertModel("claude-3-5-sonnet-latest", "文思长文本", "TEXT_GENERATION", "anthropic", "长文本分析与教学反馈");
    }

    private void upsertModel(String modelId, String name, String type, String provider, String desc) {
        Model m = modelRepository.findByModelId(modelId).orElseGet(Model::new);
        m.setModelId(modelId);
        m.setName(name);
        m.setType(type);
        m.setProvider(provider);
        m.setDescription(desc);
        m.setIsActive(true);
        if (m.getApiFormat() == null) {
            m.setApiFormat("openai");
        }
        if (m.getConfig() == null || m.getConfig().isEmpty()) {
            m.setConfig(("TEXT_TO_IMAGE".equals(type) || "BOTH".equals(type))
                    ? ModelConfigUtil.buildImageConfigJson(modelId, m.getApiFormat())
                    : "{}");
        }
        modelRepository.save(m);
    }

    // ---------- Classes ----------
    private List<ClassGroup> seedClasses(User teacher) {
        List<ClassGroup> classes = new ArrayList<>();

        ClassGroup c1 = new ClassGroup();
        c1.setName("高一(3)班");
        c1.setTeacherId(teacher.getId());
        c1.setDescription("美术特长班");
        c1.setSortOrder(0);
        classes.add(classGroupRepository.save(c1));

        ClassGroup c2 = new ClassGroup();
        c2.setName("高一(4)班");
        c2.setTeacherId(teacher.getId());
        c2.setDescription("普通班");
        c2.setSortOrder(1);
        classes.add(classGroupRepository.save(c2));

        return classes;
    }

    // ---------- Users ----------
    private User ensureTeacher() {
        return userRepository.findByUsername("teacher").orElseGet(() -> {
            User t = new User();
            t.setUsername("teacher");
            t.setPasswordHash(passwordEncoder.encode("123456"));
            t.setDisplayName("王老师 (Teacher)");
            t.setRole("TEACHER");
            t.setIsActive(true);
            return userRepository.save(t);
        });
    }

    private List<User> seedStudents(User teacher, List<ClassGroup> classes) {
        List<User> list = new ArrayList<>();
        for (int i = 0; i < ROSTER.length; i++) {
            String[] row = ROSTER[i];
            User u = userRepository.findByUsername(row[0]).orElseGet(User::new);
            u.setUsername(row[0]);
            u.setDisplayName(row[1]);
            u.setRole("STUDENT");
            u.setTeacherId(teacher.getId());
            u.setIsActive(true);
            if (u.getPasswordHash() == null) {
                u.setPasswordHash(passwordEncoder.encode("123456"));
            }
            if (!classes.isEmpty()) {
                u.setClassGroupId(classes.get(i < 20 ? 0 : 1).getId());
            }
            list.add(userRepository.save(u));
        }
        return list;
    }

    // ---------- Templates ----------
    private void seedTemplates(User teacher) {
        String tid = teacher.getId();
        saveTemplate(tid, DEMO_MARKER_TITLE, "人物",
                "一位{身份}站在{场景}中，{光线}，{画风}，电影级构图，超高清细节",
                "适合人物角色练习，引导学生填入身份、场景、光线和画风。");
        saveTemplate(tid, "[演示] 节气海报", "海报",
                "{节气}主题中文海报，包含{元素}，{配色}，平面排版，大量留白，宋体标题",
                "二十四节气系列海报，强调中文版式与配色。");
        saveTemplate(tid, "[演示] 校园风景写生", "风景",
                "{季节}的校园{地点}，{时间}的光线，{氛围}，水彩画风",
                "鼓励学生从校园场景出发，培养观察力。");
        saveTemplate(tid, "[演示] 静物质感练习", "静物",
                "{物品}静物组合，{光源}，{背景材质}背景，{画风}",
                "聚焦光影与质感，适合美术基础课。");
        saveTemplate(tid, "[演示] 童话角色再设计", "人物",
                "{童话角色}的现代再设计，{风格}风格，手持{道具}，电影级渲染",
                "引导学生在经典 IP 基础上做再创作。");
        saveTemplate(tid, "[演示] 抽象情绪表达", "抽象",
                "用{色彩}和{形状}表达{情绪}，抽象艺术，画布纹理，高对比",
                "色彩心理学练习，适合情绪与表达课题。");
    }

    private void saveTemplate(String teacherId, String title, String category, String content, String desc) {
        Template t = new Template();
        t.setTeacherId(teacherId);
        t.setTitle(title);
        t.setCategory(category);
        t.setTemplateContent(content);
        t.setDescription(desc);
        templateRepository.save(t);
    }

    // ---------- Assignments ----------
    private List<Assignment> seedAssignments(User teacher) {
        LocalDateTime now = LocalDateTime.now();
        List<Assignment> out = new ArrayList<>();

        out.add(saveAssignment(teacher, "校园秋日写生：用 AI 重现你眼中的校园",
                "以校园秋天为题材，提交一幅能体现光影与情绪的作品。要求画面构图完整，色彩温暖，至少包含一处典型校园元素（教学楼、林荫道、操场、图书馆）。",
                "STANDARD", null, 1, now.minusDays(2), null, null, now.minusDays(7)));

        out.add(saveAssignment(teacher, "二十四节气海报设计 · 立春",
                "围绕「立春」主题制作海报，注重中文版式、留白与节气意象。鼓励使用模板「[演示] 节气海报」起步。",
                "STANDARD", null, 2, now.plusDays(3), null, null, now.minusDays(3)));

        out.add(saveAssignment(teacher, "15 分钟限时：童话角色再设计",
                "在 15 分钟内完成一次角色再设计，可参考小红帽、白雪公主、孙悟空等经典形象，鼓励赋予现代职业或科幻设定。",
                "CHALLENGE", "ACTIVE", 1, null, 15, now.minusMinutes(6), now.minusHours(1)));

        out.add(saveAssignment(teacher, "20 分钟限时：未来交通工具想象",
                "限时挑战：构想 2050 年的城市交通工具，提交一幅完整的概念图，重点是材料质感与城市背景。",
                "CHALLENGE", "ENDED", 1, null, 20,
                now.minusDays(1).minusMinutes(20), now.minusDays(1).minusMinutes(30)));

        out.add(saveAssignment(teacher, "用色彩讲故事：情绪练习",
                "围绕「孤独」「希望」「热烈」三种情绪任选其一，用抽象色彩与构图表达感受。提交后请在描述里说明你的色彩选择。",
                "STANDARD", null, 3, now.plusDays(7), null, null, now.minusHours(8)));

        return out;
    }

    private Assignment saveAssignment(User teacher, String title, String desc, String type,
                                      String status, int maxSubs, LocalDateTime deadline,
                                      Integer durationMin, LocalDateTime startedAt,
                                      LocalDateTime createdAt) {
        Assignment a = new Assignment();
        a.setTeacherId(teacher.getId());
        a.setTitle(title);
        a.setDescription(desc);
        a.setType(type);
        a.setStatus(status);
        a.setMaxSubmissions(maxSubs);
        a.setDeadline(deadline);
        a.setDurationMin(durationMin);
        a.setStartedAt(startedAt);
        if ("ENDED".equals(status) && startedAt != null && durationMin != null) {
            a.setEndedAt(startedAt.plusMinutes(durationMin));
        }
        a.setIsActive(true);
        Assignment saved = assignmentRepository.save(a);
        if (createdAt != null) {
            jdbcTemplate.update("UPDATE assignments SET created_at = ? WHERE id = ?", createdAt, saved.getId());
        }
        return saved;
    }

    // ---------- Submissions ----------
    private void seedSubmissions(List<User> students, List<Assignment> assignments) {
        Assignment a1 = assignments.get(0);
        Assignment a2 = assignments.get(1);
        Assignment a3 = assignments.get(2);
        Assignment a4 = assignments.get(3);
        Assignment a5 = assignments.get(4);
        LocalDateTime now = LocalDateTime.now();

        // a1 校园秋日 (已截止): 30 学生提交 = 22 已批改 + 8 待批
        String[] a1Feedback = {
                "构图很完整，远近层次表达得不错，建议下次在色彩饱和度上再克制一点。",
                "光影方向把握准确，整体氛围温暖，建议加强主体的视觉中心。",
                "整体不错，秋天的氛围出来了，落叶的节奏可以再丰富一些。",
                "想法不错，但画面略空，建议增加前景元素丰富层次。",
                "非常出色，色彩克制、构图扎实，是这次作业的范例。",
                "情绪很到位，构图稳，可以再注意一下透视的统一性。",
                "暖灰调用得不错，下次可以试试在重点处提高对比。",
                "树影和地面落叶的笔触很轻盈，建议加强建筑的体量感。",
                "前景人物的存在让画面更有故事感，整体节奏不错。",
                "画面节奏明快，但右上方略空，可补一些远景元素。"
        };
        for (int i = 0; i < 30; i++) {
            User stu = students.get(i);
            String prompt = studentPrompt(i, "校园秋日");
            String url = seedFor("autumn-" + i);
            String modelId = (i % 2 == 0) ? MODEL_GPT_IMAGE : MODEL_DALLE3;
            LocalDateTime when = now.minusDays(2).minusHours((i % 6) + 1).minusMinutes(i * 7L);
            if (i < 22) {
                int score = 78 + ((i * 13) % 20);
                seedSubmission(stu, a1, "REVIEWED", score, a1Feedback[i % a1Feedback.length],
                        prompt, url, modelId, when);
            } else {
                seedSubmission(stu, a1, "PENDING", null, null, prompt, url, modelId, when);
            }
        }

        // a2 立春海报 (进行中): 20 学生 = 6 已批改 + 14 待批
        String[] a2Variants = {
                "立春主题中文海报，包含柳枝与初芽，浅绿配米色，平面排版，大量留白，宋体标题",
                "立春主题中文海报，包含燕子与柳枝，淡粉配奶白，平面排版，大量留白，宋体标题",
                "立春主题中文海报，包含梅花与远山，水墨配淡黄，平面排版，大量留白，宋体标题",
                "立春主题中文海报，包含早春田野，米色配嫩绿，平面排版，大量留白，宋体标题",
                "立春主题中文海报，包含柳条与水波，靛蓝配奶白，平面排版，大量留白，宋体标题",
                "立春主题中文海报，包含燕子轮廓，淡米黄配赭石，平面排版，大量留白，宋体标题"
        };
        String[] a2Feedback = {
                "中文排版处理得很好，节气意象清晰。建议字体层级再拉开一点。",
                "构图大气，留白舒服，立春的元素抓得很准。",
                "色彩配比克制有度，但主标题可以再加一点张力。",
                "整体很有传统美术风味，建议节气文字的位置再往上移。",
                "用色雅致，节奏舒缓，是不错的海报范例。",
                "构图与色彩都到位，下次可以尝试更鲜明的视觉中心。"
        };
        for (int i = 0; i < 20; i++) {
            User stu = students.get((i + 5) % students.size());
            String prompt = a2Variants[i % a2Variants.length];
            String url = seedFor("lichun-" + i);
            LocalDateTime when = now.minusDays((i % 3) + 1).minusHours(i % 12);
            if (i < 6) {
                seedSubmission(stu, a2, "REVIEWED", 84 + (i * 3) % 12,
                        a2Feedback[i % a2Feedback.length], prompt, url, MODEL_GEMINI, when);
            } else {
                seedSubmission(stu, a2, "PENDING", null, null, prompt, url, MODEL_GEMINI, when);
            }
        }

        // a3 限时挑战进行中: 12 学生提交，全部 PENDING
        String[] fairyVariants = {
                "小红帽的现代再设计，赛博朋克风格，手持发光匕首，电影级渲染",
                "孙悟空的现代再设计，蒸汽朋克风格，手持机械金箍棒，电影级渲染",
                "白雪公主的现代再设计，极简未来风格，手持全息苹果，电影级渲染",
                "灰姑娘的现代再设计，机甲风格，手持发光水晶鞋，电影级渲染",
                "美人鱼公主的现代再设计，深海科幻风格，手持声波法器，电影级渲染",
                "睡美人的现代再设计，赛博修仙风格，手持光纹魔杖，电影级渲染",
                "彼得潘的现代再设计，未来都市风格，手持折叠飞行器，电影级渲染",
                "爱丽丝的现代再设计，迷幻几何风格，手持立体怀表，电影级渲染",
                "牛魔王的现代再设计，重金属朋克风格，手持机械战斧，电影级渲染",
                "哪吒的现代再设计，未来神话风格，手持等离子混天绫，电影级渲染",
                "嫦娥的现代再设计，太空美学风格，手持电子玉兔，电影级渲染",
                "杨戬的现代再设计，赛博修真风格，手持发光三尖刀，电影级渲染"
        };
        for (int i = 0; i < 12; i++) {
            User stu = students.get((i * 3 + 1) % students.size());
            seedSubmission(stu, a3, "PENDING", null, null,
                    fairyVariants[i], seedFor("fairy-" + i), MODEL_GPT_IMAGE,
                    now.minusMinutes(5 - (i % 5)));
        }

        // a4 限时挑战已结束: 25 学生提交，全部已批改
        String[] futureFeedback = {
                "概念清晰，但材质表现略平，建议研究一下金属与玻璃的反光。",
                "想法新颖，城市背景的处理很高级。",
                "时间紧的情况下完成度可以，画面中心可以再聚焦。",
                "整体很有概念图的味道，光影方向统一。",
                "本次最佳作品之一，材料、构图、色彩都很扎实。",
                "构图完整，建议下次尝试更大胆的色彩对比。",
                "未来感拿捏得不错，飞行轨迹的虚实处理很有想法。",
                "材质上偏一致，可以尝试更多对比材料增加层次。"
        };
        String[] futurePrompts = {
                "2050 年城市悬浮列车，半透明玻璃车厢，霓虹城市背景，电影级概念图",
                "2050 年个人飞行器，碳纤维材质，黄昏天际线，电影级概念图",
                "2050 年磁悬浮单车，未来城市街区，傍晚柔光，电影级概念图",
                "2050 年自行车形态的飞行器，珍珠白漆面，赛博城市背景，电影级概念图",
                "2050 年家用胶囊飞船，亚光金属机身，云海背景，电影级概念图",
                "2050 年水陆两栖通勤舱，玻璃顶棚，海滨城市背景，电影级概念图",
                "2050 年共享磁悬浮快艇，金属漆面，跨海大桥背景，电影级概念图",
                "2050 年模块化通勤胶囊，珠光涂装，未来高架背景，电影级概念图"
        };
        for (int i = 0; i < 25; i++) {
            User stu = students.get((i * 2 + 3) % students.size());
            seedSubmission(stu, a4, "REVIEWED", 78 + (i * 5) % 20,
                    futureFeedback[i % futureFeedback.length],
                    futurePrompts[i % futurePrompts.length], seedFor("future-" + i),
                    MODEL_GPT_IMAGE, now.minusDays(1).minusMinutes(15 - (i % 15)));
        }

        // a5 色彩情绪 (新发布): 8 学生提交，全部 PENDING
        String[] moodPrompts = {
                "用深蓝色与缓慢的圆形表达孤独，抽象艺术，画布纹理，高对比",
                "用金黄与发散光线表达希望，抽象艺术，画布纹理，高对比",
                "用红黑撞色与锯齿形状表达热烈，抽象艺术，画布纹理，高对比",
                "用紫灰渐变与漂浮形状表达孤独，抽象艺术，画布纹理，高对比",
                "用橙白渐层与上升线条表达希望，抽象艺术，画布纹理，高对比",
                "用品红与撕裂的笔触表达热烈，抽象艺术，画布纹理，高对比",
                "用青蓝与零散圆点表达孤独，抽象艺术，画布纹理，高对比",
                "用珊瑚色与爆裂笔触表达热烈，抽象艺术，画布纹理，高对比"
        };
        for (int i = 0; i < 8; i++) {
            User stu = students.get((i * 5) % students.size());
            seedSubmission(stu, a5, "PENDING", null, null, moodPrompts[i],
                    seedFor("mood-" + i), MODEL_DALLE3, now.minusHours(i + 1L));
        }
    }

    private void seedSubmission(User student, Assignment a, String status, Integer score,
                                String feedback, String prompt, String imageUrl,
                                String modelId, LocalDateTime createdAt) {
        Generation g = new Generation();
        g.setUserId(student.getId());
        g.setModelId(modelId);
        g.setType("TEXT_TO_IMAGE");
        g.setPrompt(prompt);
        g.setOutputImageUrl(imageUrl);
        g.setSize("1024x1024");
        g.setQuality("standard");
        g.setDurationMs(8400 + (Math.abs(prompt.hashCode()) % 4000));
        Generation savedGen = generationRepository.save(g);
        if (createdAt != null) {
            jdbcTemplate.update("UPDATE generations SET created_at = ? WHERE id = ?", createdAt, savedGen.getId());
        }

        Submission s = new Submission();
        s.setAssignmentId(a.getId());
        s.setStudentId(student.getId());
        s.setGenerationId(savedGen.getId());
        s.setImageUrl(imageUrl);
        s.setStatus(status);
        s.setScore(score);
        s.setFeedback(feedback);
        Submission savedSub = submissionRepository.save(s);
        if (createdAt != null) {
            jdbcTemplate.update("UPDATE submissions SET created_at = ?, updated_at = ? WHERE id = ?",
                    createdAt, createdAt, savedSub.getId());
        }
    }

    // ---------- Free Workspace generations ----------
    private void seedFreeGenerations(List<User> students) {
        String[] models = {MODEL_GPT_IMAGE, MODEL_DALLE3, MODEL_GEMINI};
        String[] prompts = {
                "未来城市的清晨，氢能机车飞驰在云端轨道上，朝霞照射，电影级渲染",
                "玻璃罐里的微型雨林，光线从顶部漏下，湿润的氛围，宫崎骏风格",
                "穿汉服的少女在樱花树下抚琴，水彩画风，温柔光线",
                "宇航员坐在月球边缘看地球升起，大画幅胶片质感",
                "深海中漂浮的发光水母群，幽蓝色调，神秘梦境",
                "京都老茶室的雪天午后，光透过纸窗，温暖的米色",
                "雨夜霓虹下的赛博朋克小巷，反光的水洼，超清晰细节",
                "故宫角楼的雪景，黄昏的金色光线，水墨意境",
                "热带雨林深处的发光蘑菇王国，奇幻插画风",
                "古代书院的雨夜，桌上一盏油灯，光影柔和的水彩",
                "戈壁公路上奔跑的机械鹿群，沙尘与朝霞混合",
                "中世纪图书馆的螺旋楼梯，灯光暖黄，宏大场景",
                "未来海上城市，玻璃穹顶下的市集，明亮干净",
                "敦煌飞天的现代再设计，金粉飘逸，星空背景",
                "黄昏的稻田里飞舞的萤火虫群，写实风格",
                "雪山下的玻璃别墅，火炉旁的猫，舒缓温暖的色调",
                "中国传统园林的雨后，青苔与红枫，水彩画风",
                "神秘的悬浮岛屿，瀑布从底部坠入云海，奇幻风格",
                "白色机械鲸鱼漂浮在云端，巨型机械结构，史诗感",
                "云之上的茶馆，木结构悬空，柔和阳光，禅意",
                "黄昏地铁站台上的旅人，胶片颗粒，温暖逆光",
                "未来集市里的机械商人，琳琅满目的发光小玩意，奇幻插画",
                "竹林深处的茶人，雨后云雾缭绕，水墨长卷",
                "霓虹江南：未来水乡的灯笼夜市，倒影丰富",
                "极地冰川下的发光城市，蓝紫色调，科幻插画",
                "夜晚故宫角楼上空的赛博风筝群，金红色调",
                "森林里的飞行汽车广告，干净商业摄影风",
                "海边老灯塔的晨曦，暖橙天色与冷蓝海面对比",
                "城市天台的孤独诗人，雨后水洼倒映霓虹",
                "童话森林里的夜行马戏团，灯笼与星空"
        };

        LocalDateTime now = LocalDateTime.now();
        int promptIdx = 0;
        int globalGen = 0;

        // 每个学生创建 4~6 个对话，每个对话 2~4 张图，标题 = 首条提示词
        for (User stu : students) {
            int convCount = 4 + (Math.abs(stu.getUsername().hashCode()) % 3);
            for (int c = 0; c < convCount; c++) {
                String basePrompt = prompts[promptIdx % prompts.length];
                Conversation conv = new Conversation();
                conv.setUserId(stu.getId());
                conv.setTitle(basePrompt);
                String convId = conversationRepository.save(conv).getId();

                int imgCount = 2 + ((promptIdx + c) % 3);
                for (int g = 0; g < imgCount; g++) {
                    String prompt = basePrompt + (g > 0 ? "，更柔和的色调，更克制的对比" : "");
                    String modelId = models[(globalGen) % models.length];
                    String url = seedFor("free-" + promptIdx + "-" + g);

                    int dayBack = (globalGen * 3) % 7;
                    int hour = 8 + (globalGen * 13) % 14;
                    int minute = (globalGen * 17) % 60;
                    LocalDateTime when = now.minusDays(dayBack)
                            .withHour(hour).withMinute(minute).withSecond(0).withNano(0);
                    if (dayBack == 0 && when.isAfter(now)) {
                        when = now.minusMinutes(5L + globalGen);
                    }

                    Generation gen = new Generation();
                    gen.setUserId(stu.getId());
                    gen.setModelId(modelId);
                    gen.setType("TEXT_TO_IMAGE");
                    gen.setPrompt(prompt);
                    gen.setOutputImageUrl(url);
                    gen.setSize("1024x1024");
                    gen.setQuality("standard");
                    gen.setDurationMs(7000 + (g % 8) * 600);
                    gen.setConversationId(convId);
                    Generation saved = generationRepository.save(gen);
                    jdbcTemplate.update("UPDATE generations SET created_at = ? WHERE id = ?",
                            when, saved.getId());
                    globalGen++;
                }
                promptIdx++;
            }
        }
    }

    private String studentPrompt(int idx, String topic) {
        String[] palette = {"温暖的金黄色调", "克制的米白与豆沙", "蓝绿对比", "橙红与靛蓝",
                "低饱和度灰调", "明快的橙黄", "冷蓝主调", "暮色紫粉"};
        String[] mood = {"宁静悠远", "热烈奔放", "温柔抒情", "庄重沉稳",
                "灵动俏皮", "怀旧氛围", "梦幻诗意", "克制内敛"};
        return topic + "主题，校园林荫道场景，" + palette[idx % palette.length]
                + "，" + mood[idx % mood.length] + "，水彩画风，构图完整";
    }

    private String seedFor(String key) {
        return "https://picsum.photos/seed/jincai-zhihui-" + key + "/1024/1024";
    }
}
