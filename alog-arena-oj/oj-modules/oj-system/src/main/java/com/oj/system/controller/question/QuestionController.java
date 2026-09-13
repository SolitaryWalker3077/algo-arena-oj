package com.oj.system.controller.question;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.TableDataInfo;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.service.question.IQuestionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/question")
@Tag(name = "题目管理接口")
public class QuestionController extends BaseController {

    @Autowired
    private IQuestionService questionService;

    @GetMapping("/list")
    public TableDataInfo list(QuestionQueryDto questionQueryDto) {
       return getDataTable(questionService.list(questionQueryDto));
    }
}
