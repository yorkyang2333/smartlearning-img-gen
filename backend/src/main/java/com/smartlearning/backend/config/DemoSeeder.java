package com.smartlearning.backend.config;

import com.smartlearning.backend.entity.Assignment;
import com.smartlearning.backend.entity.Conversation;
import com.smartlearning.backend.entity.Generation;
import com.smartlearning.backend.entity.Submission;
import com.smartlearning.backend.entity.Template;
import com.smartlearning.backend.entity.User;
import com.smartlearning.backend.repository.AssignmentRepository;
import com.smartlearning.backend.repository.ConversationRepository;
import com.smartlearning.backend.repository.GenerationRepository;
import com.smartlearning.backend.repository.SubmissionRepository;
import com.smartlearning.backend.repository.TemplateRepository;
import com.smartlearning.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
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

    @Autowired private UserRepository userRepository;
    @Autowired private AssignmentRepository assignmentRepository;
    @Autowired private SubmissionRepository submissionRepository;
    @Autowired private GenerationRepository generationRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private TemplateRepository templateRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        boolean alreadySeeded = templateRepository.findAll().stream()
                .anyMatch(t -> DEMO_MARKER_TITLE.equals(t.getTitle()));
        if (alreadySeeded) {
            System.out.println("ℹ️ 演示数据已存在，跳过 DemoSeeder。");
            return;
        }

        User teacher = userRepository.findByUsername("teacher").orElseGet(() -> {
            User t = new User();
            t.setUsername("teacher");
            t.setPasswordHash(passwordEncoder.encode("123456"));
            t.setDisplayName("王老师 (Teacher)");
            t.setRole("TEACHER");
            t.setIsActive(true);
            return userRepository.save(t);
        });

        List<User> students = seedStudents(teacher);
        seedTemplates(teacher);
        List<Assignment> assignments = seedAssignments(teacher);
        seedSubmissionsAndGenerations(students, assignments);
        seedFreeWorkspaceGenerations(students);

        System.out.println("✅ 演示数据已注入：");
        System.out.println("  · 学生 " + students.size() + " 人（默认密码 123456）");
        System.out.println("  · 作业 " + assignments.size() + " 个（含进行中/已结束/限时挑战）");
        System.out.println("  · 提交、生成历史、对话已铺好，准备好直接演示。");
    }

    private List<User> seedStudents(User teacher) {
        String[][] roster = {
                {"linyutong",  "李雨桐"},
                {"zhangzixuan","张子轩"},
                {"wangzihan",  "王梓涵"},
                {"chensiyuan", "陈思远"},
                {"liuxinyi",   "刘欣怡"},
                {"zhouhaoran", "周浩然"},
                {"wuyutong",   "吴语桐"},
                {"zhengmingxuan","郑明轩"},
                {"zhaowanqing","赵婉清"},
                {"sunruotong", "孙若彤"}
        };
        List<User> list = new ArrayList<>();
        for (String[] row : roster) {
            User u = userRepository.findByUsername(row[0]).orElseGet(User::new);
            u.setUsername(row[0]);
            u.setDisplayName(row[1]);
            u.setRole("STUDENT");
            u.setTeacherId(teacher.getId());
            u.setIsActive(true);
            if (u.getPasswordHash() == null) {
                u.setPasswordHash(passwordEncoder.encode("123456"));
            }
            list.add(userRepository.save(u));
        }
        return list;
    }

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

    private List<Assignment> seedAssignments(User teacher) {
        LocalDateTime now = LocalDateTime.now();
        List<Assignment> out = new ArrayList<>();

        Assignment a1 = baseAssignment(teacher, "校园秋日写生：用 AI 重现你眼中的校园",
                "以校园秋天为题材，提交一幅能体现光影与情绪的作品。要求画面构图完整，色彩温暖，至少包含一处典型校园元素（教学楼、林荫道、操场、图书馆）。",
                "STANDARD");
        a1.setMaxSubmissions(1);
        a1.setDeadline(now.minusDays(2));
        a1.setCreatedAt(now.minusDays(7));
        out.add(assignmentRepository.save(a1));

        Assignment a2 = baseAssignment(teacher, "二十四节气海报设计 · 立春",
                "围绕「立春」主题制作海报，注重中文版式、留白与节气意象。鼓励使用模板「[演示] 节气海报」起步。",
                "STANDARD");
        a2.setMaxSubmissions(2);
        a2.setDeadline(now.plusDays(3));
        a2.setCreatedAt(now.minusDays(3));
        out.add(assignmentRepository.save(a2));

        Assignment a3 = baseAssignment(teacher, "15 分钟限时：童话角色再设计",
                "在 15 分钟内完成一次角色再设计，可参考小红帽、白雪公主、孙悟空等经典形象，鼓励赋予现代职业或科幻设定。",
                "CHALLENGE");
        a3.setDurationMin(15);
        a3.setStatus("ACTIVE");
        a3.setStartedAt(now.minusMinutes(6));
        a3.setMaxSubmissions(1);
        a3.setCreatedAt(now.minusHours(1));
        out.add(assignmentRepository.save(a3));

        Assignment a4 = baseAssignment(teacher, "20 分钟限时：未来交通工具想象",
                "限时挑战：构想 2050 年的城市交通工具，提交一幅完整的概念图，重点是材料质感与城市背景。",
                "CHALLENGE");
        a4.setDurationMin(20);
        a4.setStatus("ENDED");
        a4.setStartedAt(now.minusDays(1).minusMinutes(20));
        a4.setEndedAt(now.minusDays(1));
        a4.setMaxSubmissions(1);
        a4.setCreatedAt(now.minusDays(1).minusMinutes(30));
        out.add(assignmentRepository.save(a4));

        Assignment a5 = baseAssignment(teacher, "用色彩讲故事：情绪练习",
                "围绕「孤独」「希望」「热烈」三种情绪任选其一，用抽象色彩与构图表达感受。提交后请在描述里说明你的色彩选择。",
                "STANDARD");
        a5.setMaxSubmissions(3);
        a5.setDeadline(now.plusDays(7));
        a5.setCreatedAt(now.minusHours(8));
        out.add(assignmentRepository.save(a5));

        return out;
    }

    private Assignment baseAssignment(User teacher, String title, String desc, String type) {
        Assignment a = new Assignment();
        a.setTeacherId(teacher.getId());
        a.setTitle(title);
        a.setDescription(desc);
        a.setType(type);
        a.setIsActive(true);
        return a;
    }

    private void seedSubmissionsAndGenerations(List<User> students, List<Assignment> assignments) {
        Assignment a1 = assignments.get(0); // 校园秋日 - 已截止，已批改
        Assignment a2 = assignments.get(1); // 节气海报 - 进行中，部分已交
        Assignment a3 = assignments.get(2); // 限时挑战进行中
        Assignment a4 = assignments.get(3); // 限时挑战已结束

        // a1: 8 名学生提交，其中 6 个已批改，2 个待批
        int[] a1Scores = {92, 88, 85, 78, 95, 81};
        String[] a1Feedback = {
                "构图很完整，远近层次表达得不错，建议下次在色彩饱和度上再克制一点。",
                "光影方向把握准确，整体氛围温暖。建议加强主体的视觉中心。",
                "整体不错，秋天的氛围出来了，落叶的节奏可以再丰富一些。",
                "想法不错，但画面略空，建议增加前景元素丰富层次。",
                "非常出色！色彩克制、构图扎实，是这次作业的范例。",
                "情绪很到位，构图稳，可以再注意一下透视的统一性。"
        };
        for (int i = 0; i < 6; i++) {
            seedSubmission(students.get(i), a1, "REVIEWED", a1Scores[i], a1Feedback[i],
                    studentPrompt(i, "校园秋日"), seedFor("autumn-" + i));
        }
        seedSubmission(students.get(6), a1, "PENDING", null, null,
                studentPrompt(6, "校园秋日"), seedFor("autumn-6"));
        seedSubmission(students.get(7), a1, "PENDING", null, null,
                studentPrompt(7, "校园秋日"), seedFor("autumn-7"));

        // a2: 4 名学生提交，1 已批改，3 待批
        seedSubmission(students.get(0), a2, "REVIEWED", 90,
                "中文排版处理得很好，节气意象清晰。建议字体层级再拉开一点。",
                "立春主题中文海报，包含柳枝与初芽，浅绿配米色，平面排版，大量留白，宋体标题",
                seedFor("lichun-0"));
        seedSubmission(students.get(2), a2, "PENDING", null, null,
                "立春主题中文海报，包含燕子与柳枝，淡粉配奶白，平面排版，大量留白，宋体标题",
                seedFor("lichun-2"));
        seedSubmission(students.get(4), a2, "PENDING", null, null,
                "立春主题中文海报，包含梅花与远山，水墨配淡黄，平面排版，大量留白，宋体标题",
                seedFor("lichun-4"));
        seedSubmission(students.get(8), a2, "PENDING", null, null,
                "立春主题中文海报，包含早春田野，米色配嫩绿，平面排版，大量留白，宋体标题",
                seedFor("lichun-8"));

        // a3: 限时挑战进行中，3 名学生已经交了
        seedSubmission(students.get(1), a3, "PENDING", null, null,
                "小红帽的现代再设计，赛博朋克风格，手持发光匕首，电影级渲染",
                seedFor("fairy-1"));
        seedSubmission(students.get(3), a3, "PENDING", null, null,
                "孙悟空的现代再设计，蒸汽朋克风格，手持机械金箍棒，电影级渲染",
                seedFor("fairy-3"));
        seedSubmission(students.get(5), a3, "PENDING", null, null,
                "白雪公主的现代再设计，极简未来风格，手持全息苹果，电影级渲染",
                seedFor("fairy-5"));

        // a4: 已结束，6 名学生交了，全部批改
        int[] a4Scores = {86, 91, 79, 88, 94, 83};
        String[] a4Feedback = {
                "概念清晰，但材质表现略平，建议研究一下金属与玻璃的反光。",
                "想法新颖，城市背景的处理很高级。",
                "时间紧的情况下完成度可以，画面中心可以再聚焦。",
                "整体很有概念图的味道，光影方向统一。",
                "本次最佳作品之一，材料、构图、色彩都很扎实。",
                "构图完整，建议下次尝试更大胆的色彩对比。"
        };
        int[] futureStudents = {0, 2, 4, 6, 7, 9};
        String[] futurePrompts = {
                "2050 年城市悬浮列车，半透明玻璃车厢，霓虹城市背景，电影级概念图",
                "2050 年个人飞行器，碳纤维材质，黄昏天际线，电影级概念图",
                "2050 年磁悬浮单车，未来城市街区，傍晚柔光，电影级概念图",
                "2050 年自行车形态的飞行器，珍珠白漆面，赛博城市背景，电影级概念图",
                "2050 年家用胶囊飞船，亚光金属机身，云海背景，电影级概念图",
                "2050 年水陆两栖通勤舱，玻璃顶棚，海滨城市背景，电影级概念图"
        };
        for (int i = 0; i < futureStudents.length; i++) {
            int sIdx = futureStudents[i];
            seedSubmission(students.get(sIdx), a4, "REVIEWED", a4Scores[i], a4Feedback[i],
                    futurePrompts[i], seedFor("future-" + sIdx));
        }
        // a5: 暂无提交（刚发布），用于演示「新作业」状态
    }

    private void seedSubmission(User student, Assignment a, String status, Integer score,
                                String feedback, String prompt, String imageUrl) {
        Generation g = new Generation();
        g.setUserId(student.getId());
        g.setModelId("gpt-image-2");
        g.setType("TEXT_TO_IMAGE");
        g.setPrompt(prompt);
        g.setOutputImageUrl(imageUrl);
        g.setSize("1024x1024");
        g.setQuality("standard");
        g.setDurationMs(8400 + (Math.abs(prompt.hashCode()) % 4000));
        Generation saved = generationRepository.save(g);

        Submission s = new Submission();
        s.setAssignmentId(a.getId());
        s.setStudentId(student.getId());
        s.setGenerationId(saved.getId());
        s.setImageUrl(imageUrl);
        s.setStatus(status);
        s.setScore(score);
        s.setFeedback(feedback);
        submissionRepository.save(s);
    }

    private void seedFreeWorkspaceGenerations(List<User> students) {
        // 给前 5 个学生各做一个对话 + 自由创作的生成历史，撑起 Workspace / Gallery / Live
        String[] freePrompts = {
                "未来城市的清晨，氢能机车飞驰在云端轨道上，朝霞照射，电影级渲染",
                "玻璃罐里的微型雨林，光线从顶部漏下，湿润的氛围，宫崎骏风格",
                "穿汉服的少女在樱花树下抚琴，水彩画风，温柔光线",
                "宇航员坐在月球边缘看地球升起，大画幅胶片质感",
                "深海中漂浮的发光水母群，幽蓝色调，神秘梦境"
        };
        for (int i = 0; i < freePrompts.length; i++) {
            User s = students.get(i);
            Conversation conv = new Conversation();
            conv.setUserId(s.getId());
            conv.setTitle("自由创作 · " + s.getDisplayName());
            Conversation savedConv = conversationRepository.save(conv);

            for (int j = 0; j < 2; j++) {
                Generation g = new Generation();
                g.setUserId(s.getId());
                g.setModelId(j == 0 ? "dall-e-3" : "gpt-image-2");
                g.setType("TEXT_TO_IMAGE");
                g.setPrompt(freePrompts[i] + (j == 0 ? "" : "，更柔和的色调，更克制的对比"));
                g.setOutputImageUrl(seedFor("free-" + i + "-" + j));
                g.setSize("1024x1024");
                g.setQuality("standard");
                g.setDurationMs(7000 + j * 1500);
                g.setConversationId(savedConv.getId());
                generationRepository.save(g);
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
        return "https://picsum.photos/seed/smartcanvas-" + key + "/1024/1024";
    }
}
