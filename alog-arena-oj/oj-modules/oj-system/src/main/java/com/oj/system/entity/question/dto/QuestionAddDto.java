package com.oj.system.entity.question.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import javax.xml.stream.XMLEventWriter;

@Data
public class QuestionAddDto {

    @NotNull(message = "标题不能为空")
    private String title;

    @NotNull(message = "难度不能为空")
    @Size(min = 1,max = 3,message = "难度最小为1,最大为3")
    private Integer difficult;

    private Long timeLimit;

    private Long spaceLimit;

    @NotNull(message = "内容不能为空")
    private String content;

    private String questionCase;

    private String defaultCode;

    @NotNull(message = "main主方法不能为空")
    private String mainFac;
}
