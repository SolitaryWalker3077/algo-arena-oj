package com.oj.system.entity.question.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class QuestionAddDto {

    @NotBlank(message = "标题不能为空")
    @Size(max = 50, message = "标题不能超过50个字符")
    private String title;

    @NotNull(message = "难度不能为空")
    @Min(value = 1, message = "难度最小为1")
    @Max(value = 3, message = "难度最大为3")
    private Integer difficult;

    @NotNull(message = "时间限制不能为空")
    @Min(value = 100, message = "时间限制不能小于100毫秒")
    @Max(value = 60000, message = "时间限制不能超过60000毫秒")
    private Long timeLimit;

    @NotNull(message = "空间限制不能为空")
    @Min(value = 16, message = "空间限制不能小于16MB")
    @Max(value = 4096, message = "空间限制不能超过4096MB")
    private Long spaceLimit;

    @NotBlank(message = "内容不能为空")
    @Size(max = 1000, message = "内容不能超过1000个字符")
    private String content;

    @Size(max = 1000, message = "题目用例不能超过1000个字符")
    private String questionCase;

    @Size(max = 500, message = "默认代码块不能超过500个字符")
    private String defaultCode;

    @NotBlank(message = "main主方法不能为空")
    @Size(max = 500, message = "main主方法不能超过500个字符")
    private String mainFac;
}
